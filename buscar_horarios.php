<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

require_once 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

/* DADOS RECEBIDOS */

$data = $_POST["data"] ?? "";
$procedimento = $_POST["procedimento"] ?? "";

/* DEBUG */

if (!$data || !$procedimento) {

    echo json_encode([
        "status" => "erro",
        "mensagem" => "Data ou procedimento não informado.",
        "data_recebida" => $data,
        "procedimento_recebido" => $procedimento
    ]);

    exit;
}

/* VERIFICA GOOGLE SERVICE */

if (!isset($service)) {

    echo json_encode([
        "status" => "erro",
        "mensagem" => "Google Calendar service não iniciado."
    ]);

    exit;
}

/* DURAÇÕES */

$duracoes = [

    "Maquiagem Profissional" => 60,
    "Spa dos Pés" => 60,
    "Limpeza de Pele" => 75,
    "Tintura com Tinta Profissional" => 30,
    "Chapa" => 60,
    "Cachos/Ondas" => 30,
    "Escova" => 30,
    "Penteado" => 30,
    "Nanopigmentação" => 120,
    "Design com Henna" => 30,
    "Brow Lamination" => 60,
    "Lash Lifting" => 90,
    "Design Simples" => 30

];

/* VERIFICA PROCEDIMENTO */

if (!isset($duracoes[$procedimento])) {

    echo json_encode([
        "status" => "erro",
        "mensagem" => "Procedimento não encontrado.",
        "procedimento_recebido" => $procedimento
    ]);

    exit;
}

$duracao = $duracoes[$procedimento];

/* DATA */

try {

    $dataObj = new DateTime($data);

} catch (Exception $e) {

    echo json_encode([
        "status" => "erro",
        "mensagem" => "Data inválida.",
        "erro" => $e->getMessage()
    ]);

    exit;
}

$diaSemana = (int)$dataObj->format('w');

/* EXPEDIENTE */

$expediente = [

    1 => ["14:00", "19:00"],
    2 => ["09:00", "19:00"],
    3 => ["08:00", "19:00"],
    4 => ["09:00", "19:00"],
    5 => ["08:00", "19:00"],
    6 => ["07:00", "17:00"]

];

/* DOMINGO */

if ($diaSemana === 0 || !isset($expediente[$diaSemana])) {

    echo json_encode([
        "status" => "sucesso",
        "horarios" => []
    ]);

    exit;
}

/* HORÁRIO EXPEDIENTE */

$inicioExpediente = new DateTime(
    "$data " . $expediente[$diaSemana][0]
);

$fimExpediente = new DateTime(
    "$data " . $expediente[$diaSemana][1]
);

/* CALENDÁRIO */

$calendarId = 'geovanaborges304@gmail.com';

$optParams = [

    'timeMin' => $inicioExpediente->format(DateTime::RFC3339),

    'timeMax' => $fimExpediente->format(DateTime::RFC3339),

    'singleEvents' => true,

    'orderBy' => 'startTime'

];

/* BUSCA EVENTOS */

try {

    $eventos = $service->events->listEvents(
        $calendarId,
        $optParams
    );

} catch (Exception $e) {

    echo json_encode([
        "status" => "erro",
        "mensagem" => "Erro ao consultar Google Calendar.",
        "erro" => $e->getMessage()
    ]);

    exit;
}

/* EVENTOS OCUPADOS */

$ocupados = [];

foreach ($eventos->getItems() as $evento) {

    $inicioEvento = $evento->getStart()->getDateTime();

    $fimEvento = $evento->getEnd()->getDateTime();

    if ($inicioEvento && $fimEvento) {

        $ocupados[] = [

            "inicio" => (
                new DateTime($inicioEvento)
            )->setTimezone(
                new DateTimeZone('America/Sao_Paulo')
            ),

            "fim" => (
                new DateTime($fimEvento)
            )->setTimezone(
                new DateTimeZone('America/Sao_Paulo')
            )

        ];
    }
}

/* GERA HORÁRIOS */

$horariosDisponiveis = [];

$horarioTeste = clone $inicioExpediente;

while ($horarioTeste < $fimExpediente) {

    $inicioNovo = clone $horarioTeste;

    $fimNovo = clone $inicioNovo;

    $fimNovo->modify("+$duracao minutes");

    if ($fimNovo > $fimExpediente) {
        break;
    }

    $temConflito = false;

    foreach ($ocupados as $ocupado) {

        if (

            $inicioNovo < $ocupado["fim"] &&
            $fimNovo > $ocupado["inicio"]

        ) {

            $temConflito = true;
            break;
        }
    }

    if (!$temConflito) {

        $horariosDisponiveis[] =
            $inicioNovo->format("H:i");
    }

    $horarioTeste->modify("+15 minutes");
}

/* RETORNO */

echo json_encode([

    "status" => "sucesso",

    "horarios" => $horariosDisponiveis

]);