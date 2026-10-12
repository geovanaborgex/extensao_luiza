
<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Sao_Paulo');

require_once __DIR__ . '/procedimentos_service.php';

function responder(array $dados, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder([
        'status' => 'erro',
        'mensagem' => 'Método não permitido.'
    ], 405);
}

$nome = trim($_POST['nome'] ?? '');
$telefone = trim($_POST['telefone'] ?? '');
$procedimentos = $_POST['procedimentos'] ?? [];
$data = trim($_POST['data'] ?? '');
$horario = trim($_POST['horario'] ?? '');

if (
    $nome === '' ||
    $telefone === '' ||
    $data === '' ||
    $horario === '' ||
    !is_array($procedimentos) ||
    count($procedimentos) === 0
) {
    responder([
        'status' => 'erro',
        'mensagem' => 'Preencha todos os dados do agendamento.'
    ], 400);
}

try {
    $dataObj = DateTime::createFromFormat('!Y-m-d', $data);
    $inicio = DateTime::createFromFormat(
        '!Y-m-d H:i',
        "$data $horario",
        new DateTimeZone('America/Sao_Paulo')
    );

    if (
        !$dataObj ||
        $dataObj->format('Y-m-d') !== $data ||
        !$inicio ||
        $inicio->format('Y-m-d H:i') !== "$data $horario"
    ) {
        responder([
            'status' => 'erro',
            'mensagem' => 'Data ou horário inválido.'
        ], 400);
    }

    $agora = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));

    if ($inicio <= $agora) {
        responder([
            'status' => 'erro',
            'mensagem' => 'Escolha um horário futuro.'
        ], 400);
    }

    $itens = buscarProcedimentosAtivos($procedimentos);

    $duracao = 0;
    $valorTotal = 0;

    foreach ($itens as $item) {
        $duracao += $item['duracao'];
        $valorTotal += $item['valor'];
    }

    $fim = clone $inicio;
    $fim->modify("+{$duracao} minutes");

    global $service;

    $calendarId = 'luizagues99@gmail.com';

    // Verifica conflitos novamente antes de criar o evento.
    $eventos = $service->events->listEvents($calendarId, [
        'timeMin' => $inicio->format(DateTime::RFC3339),
        'timeMax' => $fim->format(DateTime::RFC3339),
        'singleEvents' => true,
        'orderBy' => 'startTime'
    ]);

    foreach ($eventos->getItems() as $eventoExistente) {
        $inicioExistente = $eventoExistente->getStart()->getDateTime();
        $fimExistente = $eventoExistente->getEnd()->getDateTime();

        if (!$inicioExistente || !$fimExistente) {
            continue;
        }

        $inicioExistente = new DateTime($inicioExistente);
        $fimExistente = new DateTime($fimExistente);

        if ($inicio < $fimExistente && $fim > $inicioExistente) {
            responder([
                'status' => 'erro',
                'mensagem' => 'Esse horário já está ocupado.'
            ], 409);
        }
    }

    $lista = implode(' + ', array_column($itens, 'procedimento'));

    $evento = new Google_Service_Calendar_Event([
        'summary' => $lista . ' - ' . $nome,
        'description' =>
            "Cliente: $nome\n" .
            "Telefone: $telefone\n" .
            "Procedimentos: $lista\n" .
            'Valor Total: R$ ' . number_format($valorTotal, 2, ',', '.') . "\n" .
            "Tempo Total: $duracao minutos",
        'start' => [
            'dateTime' => $inicio->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],
        'end' => [
            'dateTime' => $fim->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ]
    ]);

    $service->events->insert($calendarId, $evento);

    responder([
        'status' => 'sucesso',
        'duracao' => $duracao,
        'valor' => $valorTotal
    ]);

} catch (InvalidArgumentException $e) {
    responder([
        'status' => 'erro',
        'mensagem' => $e->getMessage()
    ], 400);

} catch (Throwable $e) {
    error_log('Erro ao salvar agendamento: ' . $e->getMessage());

    responder([
        'status' => 'erro',
        'mensagem' => 'Não foi possível consultar os procedimentos ou salvar o agendamento. Tente novamente.'
    ], 500);
}
