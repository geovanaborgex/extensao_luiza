<?php

header('Content-Type: application/json; charset=utf-8');
require 'google_calendar.php';
date_default_timezone_set('America/Sao_Paulo');

$data = $_POST["data"] ?? "";
$procedimento = $_POST["procedimento"] ?? "";

if (!$data || !$procedimento) {
    echo json_encode([
        "status" => "erro",
        "mensagem" => "Data ou procedimento não informado."
    ]);
    exit;
}

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
    "Cílios - Lash Lifting" => 90,
    "Design Simples" => 30
];

if (!isset($duracoes[$procedimento])) {
    echo json_encode([
        "status" => "erro",
        "mensagem" => "Procedimento inválido."
    ]);
    exit;
}

$duracao = $duracoes[$procedimento];

$dataObj = new DateTime($data);
$diaSemana = (int)$dataObj->format('w'); // 0 domingo, 1 segunda...

$expediente = [
    1 => ["14:00", "19:00"],
    2 => ["09:00", "19:00"],
    3 => ["08:00", "19:00"],
    4 => ["09:00", "19:00"],
    5 => ["08:00", "19:00"],
    6 => ["07:00", "17:00"]
];

if ($diaSemana === 0 || !isset($expediente[$diaSemana])) {
    echo json_encode([
        "status" => "sucesso",
        "horarios" => []
    ]);
    exit;
}

$inicioExpediente = new DateTime("$data " . $expediente[$diaSemana][0]);
$fimExpediente = new DateTime("$data " . $expediente[$diaSemana][1]);

$calendarId = 'geovanaborges304@gmail.com';

$optParams = [
    'timeMin' => $inicioExpediente->format(DateTime::RFC3339),
    'timeMax' => $fimExpediente->format(DateTime::RFC3339),
    'singleEvents' => true,
    'orderBy' => 'startTime',
];

$eventos = $service->events->listEvents($calendarId, $optParams);

$ocupados = [];

foreach ($eventos->getItems() as $evento) {
    $inicioEvento = $evento->getStart()->getDateTime();
    $fimEvento = $evento->getEnd()->getDateTime();

    if ($inicioEvento && $fimEvento) {
        $ocupados[] = [
            "inicio" => (new DateTime($inicioEvento))->setTimezone(new DateTimeZone('America/Sao_Paulo')),
            "fim" => (new DateTime($fimEvento))->setTimezone(new DateTimeZone('America/Sao_Paulo'))
        ];
    }
}

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
        if ($inicioNovo < $ocupado["fim"] && $fimNovo > $ocupado["inicio"]) {
            $temConflito = true;
            break;
        }
    }

    if (!$temConflito) {
        $horariosDisponiveis[] = $inicioNovo->format("H:i");
    }

    $horarioTeste->modify("+15 minutes");
}

echo json_encode([
    "status" => "sucesso",
    "horarios" => $horariosDisponiveis
]);