
<?php
require_once __DIR__ . '/procedimentos_service.php';

const PAGAMENTOS_PLANILHA_ID =
    '1qCcyDo4NEWUaX3H66-RpKQb6KttsQAlIzyc5q-9r6Ec';

const PAGAMENTOS_CALENDAR_ID = 'luizagues99@gmail.com';

function pagamentoResponder(
    array $dados,
    int $codigo = 200
): void {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
}

function pagamentoSheets(): Google_Service_Sheets
{
    global $client;

    return new Google_Service_Sheets($client);
}

function pagamentoBuscarPedido(string $pedidoId): array
{
    $sheets = pagamentoSheets();

    $resposta = $sheets->spreadsheets_values->get(
        PAGAMENTOS_PLANILHA_ID,
        "'Pagamentos'!A2:N"
    );

    $linhas = $resposta->getValues() ?? [];

    foreach ($linhas as $indice => $linha) {
        if (trim((string)($linha[0] ?? '')) === $pedidoId) {
            return [
                'linha' => $indice + 2,
                'dados' => array_pad($linha, 14, '')
            ];
        }
    }

    throw new RuntimeException('Pedido não encontrado.');
}

function pagamentoAtualizarPedido(
    int $linha,
    array $pedido,
    string $status,
    string $slug = '',
    string $transacao = '',
    string $comprovante = ''
): void {
    $sheets = pagamentoSheets();

    $valores = [
        $status,
        $pedido[10] ?? '',
        $slug !== '' ? $slug : ($pedido[11] ?? ''),
        $transacao !== '' ? $transacao : ($pedido[12] ?? ''),
        $comprovante !== '' ? $comprovante : ($pedido[13] ?? '')
    ];

    $corpo = new Google_Service_Sheets_ValueRange([
        'values' => [$valores]
    ]);

    $sheets->spreadsheets_values->update(
        PAGAMENTOS_PLANILHA_ID,
        "'Pagamentos'!J{$linha}:N{$linha}",
        $corpo,
        ['valueInputOption' => 'RAW']
    );
}

function pagamentoConsultarInfinitePay(
    string $pedidoId,
    string $slug,
    string $transacao
): array {
    $handle = trim((string)getenv('INFINITEPAY_HANDLE'));

    if ($handle === '' || $slug === '' || $transacao === '') {
        throw new RuntimeException(
            'Dados insuficientes para validar o pagamento.'
        );
    }

    if (!function_exists('curl_init')) {
        throw new RuntimeException('cURL não está disponível.');
    }

    $payload = [
        'handle' => $handle,
        'order_nsu' => $pedidoId,
        'transaction_nsu' => $transacao,
        'slug' => $slug
    ];

    $curl = curl_init(
        'https://api.checkout.infinitepay.io/payment_check'
    );

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20
    ]);

    $resposta = curl_exec($curl);
    $erro = curl_error($curl);
    $codigo = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);

    curl_close($curl);

    if ($resposta === false || $erro !== '') {
        throw new RuntimeException(
            'Não foi possível consultar a InfinitePay.'
        );
    }

    $dados = json_decode($resposta, true);

    if (
        $codigo < 200 ||
        $codigo >= 300 ||
        !is_array($dados)
    ) {
        throw new RuntimeException(
            'A InfinitePay não retornou uma validação válida.'
        );
    }

    return $dados;
}

function pagamentoConfirmar(
    string $pedidoId,
    string $slug,
    string $transacao,
    string $comprovante = ''
): array {
    if (
        $pedidoId === '' ||
        !preg_match('/^[A-Za-z0-9_-]{1,100}$/', $pedidoId)
    ) {
        throw new InvalidArgumentException('Pedido inválido.');
    }

    $registro = pagamentoBuscarPedido($pedidoId);
    $linha = $registro['linha'];
    $pedido = $registro['dados'];

    $statusAtual = strtoupper(trim((string)$pedido[9]));

    if ($statusAtual === 'CONFIRMADO') {
        return [
            'sucesso' => true,
            'mensagem' => 'Este agendamento já foi confirmado.'
        ];
    }

    // Só processa pedidos que realmente foram registrados
    // pelo criar_pagamento.php.
    if (!in_array($statusAtual, ['PENDENTE', 'PAGO'], true)) {
        return [
            'sucesso' => false,
            'mensagem' => 'O pedido não está disponível para confirmação.'
        ];
    }

    $verificacao = pagamentoConsultarInfinitePay(
        $pedidoId,
        $slug,
        $transacao
    );

    if (
        ($verificacao['success'] ?? false) !== true ||
        ($verificacao['paid'] ?? false) !== true
    ) {
        return [
            'sucesso' => false,
            'mensagem' => 'O pagamento ainda não foi confirmado.'
        ];
    }

    $valorEsperado = (int)$pedido[8];

    if (
        $valorEsperado <= 0 ||
        !isset($verificacao['amount']) ||
        (int)$verificacao['amount'] !== $valorEsperado
    ) {
        pagamentoAtualizarPedido(
            $linha,
            $pedido,
            'DIVERGENCIA_VALOR',
            $slug,
            $transacao,
            $comprovante
        );

        return [
            'sucesso' => false,
            'mensagem' => 'O valor do pagamento precisa ser conferido.'
        ];
    }

    // Impede a criação do evento caso a data seja inválida
    // ou já tenha passado.
    $data = trim((string)$pedido[5]);
    $horario = trim((string)$pedido[6]);

    $fuso = new DateTimeZone('America/Sao_Paulo');
    $inicio = DateTime::createFromFormat(
        '!Y-m-d H:i',
        "$data $horario",
        $fuso
    );

    if (
        !$inicio ||
        $inicio->format('Y-m-d H:i') !== "$data $horario" ||
        $inicio <= new DateTime('now', $fuso)
    ) {
        pagamentoAtualizarPedido(
            $linha,
            $pedido,
            'PAGO_REVISAR_HORARIO',
            $slug,
            $transacao,
            $comprovante
        );

        return [
            'sucesso' => false,
            'mensagem' =>
                'Pagamento localizado, mas o horário precisa ser revisado.'
        ];
    }

    $nomes = json_decode(
        (string)$pedido[4],
        true
    );

    if (!is_array($nomes) || count($nomes) === 0) {
        throw new RuntimeException(
            'A lista de procedimentos do pedido está inválida.'
        );
    }

    $itens = buscarProcedimentosAtivos($nomes);

    $duracao = 0;
    $valorTotal = 0;

    foreach ($itens as $item) {
        $duracao += (int)$item['duracao'];
        $valorTotal += (float)$item['valor'];
    }

    $fim = clone $inicio;
    $fim->modify("+{$duracao} minutes");

    global $service;

    $calendarId = PAGAMENTOS_CALENDAR_ID;

    $eventos = $service->events->listEvents($calendarId, [
        'timeMin' => $inicio->format(DateTime::RFC3339),
        'timeMax' => $fim->format(DateTime::RFC3339),
        'singleEvents' => true,
        'orderBy' => 'startTime'
    ]);

    $marcador = 'Pedido InfinitePay: ' . $pedidoId;

    foreach ($eventos->getItems() as $eventoExistente) {
        $descricaoExistente =
            (string)$eventoExistente->getDescription();

        // Se uma tentativa anterior já criou o evento,
        // não cria outro para o mesmo pedido.
        if (strpos($descricaoExistente, $marcador) !== false) {
            pagamentoAtualizarPedido(
                $linha,
                $pedido,
                'CONFIRMADO',
                $slug,
                $transacao,
                $comprovante
            );

            return [
                'sucesso' => true,
                'mensagem' => 'Agendamento já registrado.'
            ];
        }

        $inicioExistente = $eventoExistente->getStart()->getDateTime();
        $fimExistente = $eventoExistente->getEnd()->getDateTime();

        if (!$inicioExistente || !$fimExistente) {
            continue;
        }

        $inicioExistente = new DateTime($inicioExistente);
        $fimExistente = new DateTime($fimExistente);

        if ($inicio < $fimExistente && $fim > $inicioExistente) {
            pagamentoAtualizarPedido(
                $linha,
                $pedido,
                'PAGO_HORARIO_OCUPADO',
                $slug,
                $transacao,
                $comprovante
            );

            return [
                'sucesso' => false,
                'mensagem' =>
                    'Pagamento identificado, mas o horário está ocupado. É necessária uma revisão manual.'
            ];
        }
    }

    $nome = trim((string)$pedido[2]);
    $telefone = trim((string)$pedido[3]);
    $lista = implode(
        ' + ',
        array_column($itens, 'procedimento')
    );

    $evento = new Google_Service_Calendar_Event([
        'summary' => $lista . ' - ' . $nome,
        'description' =>
            "Cliente: {$nome}\n" .
            "Telefone: {$telefone}\n" .
            "Procedimentos: {$lista}\n" .
            'Valor total: R$ ' .
            number_format($valorTotal, 2, ',', '.') . "\n" .
            "Tempo total: {$duracao} minutos\n" .
            $marcador,
        'start' => [
            'dateTime' => $inicio->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],
        'end' => [
            'dateTime' => $fim->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ]
    ]);

    // Primeiro cria o evento; só depois marca como confirmado.
    $service->events->insert($calendarId, $evento);

    pagamentoAtualizarPedido(
        $linha,
        $pedido,
        'CONFIRMADO',
        $slug,
        $transacao,
        $comprovante
    );

    return [
        'sucesso' => true,
        'mensagem' => 'Pagamento validado e agendamento confirmado.'
    ];
}
