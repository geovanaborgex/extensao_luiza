<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

date_default_timezone_set('America/Sao_Paulo');

require_once __DIR__ . '/procedimentos_service.php';

function responderPagamento(array $dados, int $codigo = 200): void
{
    http_response_code($codigo);

    echo json_encode(
        $dados,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function atualizarPedido(
    Google_Service_Sheets $sheets,
    int $linha,
    array $valores
): void {
    $corpo = new Google_Service_Sheets_ValueRange([
        'values' => [$valores]
    ]);

    $sheets->spreadsheets_values->update(
        PLANILHA_PROCEDIMENTOS_ID,
        "'Pagamentos'!J{$linha}:K{$linha}",
        $corpo,
        ['valueInputOption' => 'RAW']
    );
}

function dataValida(string $data): bool
{
    $objeto = DateTime::createFromFormat('!Y-m-d', $data);

    return $objeto !== false
        && $objeto->format('Y-m-d') === $data;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');

    responderPagamento([
        'sucesso' => false,
        'mensagem' => 'Utilize uma requisição POST.'
    ], 405);
}

try {
    $dados = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!is_array($dados)) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'O corpo da requisição não é um JSON válido.'
        ], 400);
    }

    // 1. Validar os dados recebidos.
    $nome = trim((string)($dados['nome'] ?? ''));

    $telefone = preg_replace(
        '/\D+/',
        '',
        (string)($dados['telefone'] ?? '')
    );

    $data = trim((string)($dados['data'] ?? ''));
    $horario = trim((string)($dados['horario'] ?? ''));

    $nomes = $dados['procedimentos'] ?? [];

    if (
        $nome === '' ||
        mb_strlen($nome) > 150 ||
        strlen($telefone) < 10 ||
        strlen($telefone) > 13 ||
        !dataValida($data) ||
        !is_array($nomes) ||
        count($nomes) < 1 ||
        count($nomes) > 20
    ) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Confira nome, telefone, data e procedimentos.'
        ], 400);
    }

    // Normalizar horário para HH:MM.
    if (!preg_match('/^(\d{1,2}):([0-5]\d)$/', $horario, $partes)) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Horário inválido.'
        ], 400);
    }

    $hora = (int)$partes[1];
    $minuto = (int)$partes[2];

    if ($hora > 23) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Horário inválido.'
        ], 400);
    }

    $horario = sprintf('%02d:%02d', $hora, $minuto);

    $nomes = array_map(
        fn($nome) => trim((string)$nome),
        $nomes
    );

    if (
        in_array('', $nomes, true) ||
        count(array_unique($nomes)) !== count($nomes)
    ) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Existem procedimentos vazios ou repetidos.'
        ], 400);
    }

    // 2. Consultar os preços verdadeiros na planilha.
    $procedimentos = buscarProcedimentosAtivos($nomes);

    $totalCentavos = 0;

    foreach ($procedimentos as $procedimento) {
        $valor = (float)$procedimento['valor'];

        if (!is_finite($valor) || $valor <= 0) {
            responderPagamento([
                'sucesso' => false,
                'mensagem' => 'Foi encontrado um preço inválido.'
            ], 422);
        }

        $totalCentavos += (int)round($valor * 100);
    }

    $sinalCentavos = (int)round($totalCentavos * 0.20);

    if ($totalCentavos < 1 || $sinalCentavos < 1) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'O valor calculado não permite gerar a cobrança.'
        ], 422);
    }

    // 3. Ler a configuração do ambiente de desenvolvimento.
    $handle = trim((string)getenv('INFINITEPAY_HANDLE'));
    $handle = ltrim($handle, '$');

    $baseUrl = rtrim(
        trim((string)getenv('APP_BASE_URL')),
        '/'
    );

    if (
        $handle === '' ||
        !filter_var($baseUrl, FILTER_VALIDATE_URL) ||
        parse_url($baseUrl, PHP_URL_SCHEME) !== 'https'
    ) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Configure INFINITEPAY_HANDLE e APP_BASE_URL no Render.'
        ], 500);
    }

    if (!function_exists('curl_init')) {
        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'A extensão cURL não está disponível no PHP.'
        ], 500);
    }

    // Identificador exclusivo para rastrear o pedido.
    $pedidoId = 'LR'
        . date('YmdHis')
        . strtoupper(bin2hex(random_bytes(8)));

    // 4. Registrar o pedido antes de chamar a InfinitePay.
    $sheets = servicoPlanilha();

    $cabecalhos = [
        'order_nsu',
        'criado_em',
        'nome',
        'telefone',
        'procedimentos_json',
        'data',
        'horario',
        'total_centavos',
        'sinal_centavos',
        'status',
        'checkout_url',
        'invoice_slug',
        'transaction_nsu',
        'receipt_url'
    ];

    $cabecalhoAtual = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        "'Pagamentos'!A1:N1"
    )->getValues() ?? [];

    if (empty($cabecalhoAtual)) {
        $sheets->spreadsheets_values->update(
            PLANILHA_PROCEDIMENTOS_ID,
            "'Pagamentos'!A1:N1",
            new Google_Service_Sheets_ValueRange([
                'values' => [$cabecalhos]
            ]),
            ['valueInputOption' => 'RAW']
        );
    }

    $linhaPedido = [
        $pedidoId,
        date('c'),
        $nome,
        $telefone,
        json_encode($nomes, JSON_UNESCAPED_UNICODE),
        $data,
        $horario,
        $totalCentavos,
        $sinalCentavos,
        'PENDENTE',
        '',
        '',
        '',
        ''
    ];

    $respostaPlanilha = $sheets->spreadsheets_values->append(
        PLANILHA_PROCEDIMENTOS_ID,
        "'Pagamentos'!A:N",
        new Google_Service_Sheets_ValueRange([
            'values' => [$linhaPedido]
        ]),
        [
            'valueInputOption' => 'RAW',
            'insertDataOption' => 'INSERT_ROWS'
        ]
    );

    $intervalo = $respostaPlanilha
        ->getUpdates()
        ->getUpdatedRange();

    if (
        !is_string($intervalo) ||
        !preg_match('/!A(\d+):N\d+$/', $intervalo, $match)
    ) {
        throw new RuntimeException(
            'Não foi possível identificar a linha do pedido.'
        );
    }

    $linha = (int)$match[1];

    // 5. Montar a requisição para a InfinitePay.
    $descricao = 'Sinal de 20% - '
        . implode(', ', $nomes);

    $descricao = mb_substr($descricao, 0, 200);

    $payload = [
        'handle' => $handle,
        'order_nsu' => $pedidoId,
        'redirect_url' => $baseUrl . '/pagamento-retorno.php',
        'webhook_url' => $baseUrl . '/webhook_infinitepay.php',
        'items' => [
            [
                'quantity' => 1,
                'price' => $sinalCentavos,
                'description' => $descricao
            ]
        ]
    ];

    $curl = curl_init(
        'https://api.checkout.infinitepay.io/links'
    );

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25
    ]);

    $corpoResposta = curl_exec($curl);
    $erroCurl = curl_error($curl);
    $codigoHttp = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);

    curl_close($curl);

    if ($corpoResposta === false) {
        throw new RuntimeException(
            'Falha de comunicação com a InfinitePay: ' . $erroCurl
        );
    }

    $respostaCheckout = json_decode($corpoResposta, true);

    if (
        $codigoHttp < 200 ||
        $codigoHttp >= 300 ||
        !is_array($respostaCheckout) ||
        empty($respostaCheckout['url']) ||
        !filter_var(
            $respostaCheckout['url'],
            FILTER_VALIDATE_URL
        ) ||
        parse_url($respostaCheckout['url'], PHP_URL_SCHEME) !== 'https'
    ) {
        error_log(
            'InfinitePay checkout: HTTP '
            . $codigoHttp
            . ' - '
            . substr((string)$corpoResposta, 0, 1000)
        );

        atualizarPedido(
            $sheets,
            $linha,
            ['ERRO_GERACAO', '']
        );

        responderPagamento([
            'sucesso' => false,
            'mensagem' => 'Não foi possível gerar o checkout. Tente novamente mais tarde.'
        ], 502);
    }

    $urlCheckout = $respostaCheckout['url'];

    // 6. Guardar a URL para rastrear o pedido.
    atualizarPedido(
        $sheets,
        $linha,
        ['PENDENTE', $urlCheckout]
    );

    // O pagamento ainda não foi confirmado.
    responderPagamento([
        'sucesso' => true,
        'pedido' => $pedidoId,
        'url' => $urlCheckout,
        'total_centavos' => $totalCentavos,
        'sinal_centavos' => $sinalCentavos,
        'status' => 'PENDENTE'
    ]);

} catch (InvalidArgumentException $e) {
    responderPagamento([
        'sucesso' => false,
        'mensagem' => $e->getMessage()
    ], 422);

} catch (Throwable $e) {
    error_log(
        'Erro criar_pagamento.php: '
        . $e->getMessage()
    );

    responderPagamento([
        'sucesso' => false,
        'mensagem' => 'Erro interno ao preparar o pagamento. Consulte os logs do servidor.'
    ], 500);
}