
<?php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Sao_Paulo');

require_once __DIR__ . '/procedimentos_service.php';

function responderHorarios(array $dados, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

$data = trim($_POST['data'] ?? '');
$procedimentosRecebidos = $_POST['procedimentos'] ?? '';

if ($data === '' || $procedimentosRecebidos === '') {
    responderHorarios([
        'status' => 'erro',
        'mensagem' => 'Data ou procedimento não informado.'
    ], 400);
}

try {
    $dataObj = DateTime::createFromFormat('!Y-m-d', $data);

    if (!$dataObj || $dataObj->format('Y-m-d') !== $data) {
        responderHorarios([
            'status' => 'erro',
            'mensagem' => 'Data inválida.'
        ], 400);
    }

    // O JavaScript envia os nomes separados por vírgula.
    $nomes = array_values(array_filter(
        array_map('trim', explode(',', $procedimentosRecebidos)),
        fn($nome) => $nome !== ''
    ));

    if (count($nomes) === 0) {
        responderHorarios([
            'status' => 'erro',
            'mensagem' => 'Selecione pelo menos um procedimento.'
        ], 400);
    }

    $itens = buscarProcedimentosAtivos($nomes);
    $duracao = array_sum(array_column($itens, 'duracao'));

    $diaSemana = (int)$dataObj->format('w');

    $expediente = [
        1 => ['15:00', '19:00'],
        2 => ['09:00', '19:00'],
        3 => ['08:00', '19:00'],
        4 => ['09:00', '19:00'],
        5 => ['08:00', '19:00'],
        6 => ['07:00', '17:00']
    ];

    if ($diaSemana === 0 || !isset($expediente[$diaSemana])) {
        responderHorarios([
            'status' => 'sucesso',
            'horarios' => []
        ]);
    }

    $inicioExpediente = new DateTime(
        "$data " . $expediente[$diaSemana][0]
    );

    $fimExpediente = new DateTime(
        "$data " . $expediente[$diaSemana][1]
    );

    $agora = new DateTime(
        'now',
        new DateTimeZone('America/Sao_Paulo')
    );

    $dataHoje = $agora->format('Y-m-d');

    if ($data < $dataHoje) {
        responderHorarios([
            'status' => 'sucesso',
            'horarios' => []
        ]);
    }

    $calendarId = 'luizagues99@gmail.com';

    global $service;

    $eventos = $service->events->listEvents($calendarId, [
        'timeMin' => $inicioExpediente->format(DateTime::RFC3339),
        'timeMax' => $fimExpediente->format(DateTime::RFC3339),
        'singleEvents' => true,
        'orderBy' => 'startTime'
    ]);

    $ocupados = [];

    foreach ($eventos->getItems() as $evento) {
        $inicioEvento = $evento->getStart()->getDateTime();
        $fimEvento = $evento->getEnd()->getDateTime();

        if ($inicioEvento && $fimEvento) {
            $ocupados[] = [
                'inicio' => new DateTime($inicioEvento),
                'fim' => new DateTime($fimEvento)
            ];
        }
    }

    $horarioTeste = clone $inicioExpediente;

    if ($data === $dataHoje && $horarioTeste < $agora) {
        $horarioTeste = clone $agora;

        $minuto = (int)$horarioTeste->format('i');

        if ($minuto === 0) {
            $horarioTeste->setTime(
                (int)$horarioTeste->format('H'), 0
            );
        } elseif ($minuto <= 30) {
            $horarioTeste->setTime(
                (int)$horarioTeste->format('H'), 30
            );
        } else {
            $horarioTeste->modify('+1 hour');
            $horarioTeste->setTime(
                (int)$horarioTeste->format('H'), 0
            );
        }
    }

    $disponiveis = [];

    while ($horarioTeste < $fimExpediente) {
        $inicioNovo = clone $horarioTeste;
        $fimNovo = clone $inicioNovo;
        $fimNovo->modify("+{$duracao} minutes");

        if ($fimNovo > $fimExpediente) {
            break;
        }

        $temConflito = false;

        foreach ($ocupados as $ocupado) {
            if (
                $inicioNovo < $ocupado['fim'] &&
                $fimNovo > $ocupado['inicio']
            ) {
                $temConflito = true;
                break;
            }
        }

        if (!$temConflito) {
            $disponiveis[] = $inicioNovo->format('H:i');
        }

        $horarioTeste->modify('+30 minutes');
    }

    responderHorarios([
        'status' => 'sucesso',
        'horarios' => $disponiveis
    ]);

} catch (InvalidArgumentException $e) {
    responderHorarios([
        'status' => 'erro',
        'mensagem' => $e->getMessage()
    ], 400);

} catch (Throwable $e) {
    error_log('Erro ao buscar horários: ' . $e->getMessage());

    responderHorarios([
        'status' => 'erro',
        'mensagem' => 'Não foi possível consultar os horários. Tente novamente.'
    ], 500);
}
