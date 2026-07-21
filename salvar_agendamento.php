<?php

header('Content-Type: application/json; charset=utf-8');
require 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $nome = $_POST["nome"];
    $telefone = $_POST["telefone"];
    $servico = $_POST["servico"];
    $procedimento = $_POST["procedimento"];
    $data = $_POST["data"];
    $horario = $_POST["horario"];

    /* DURAÇÕES */
    $duracoes = [

    "Maquiagem Profissional" => 60,
    "Spa dos Pés" => 60,
    "Limpeza de Pele" => 60,
    "Tintura com Tinta Profissional" => 90,
    "Chapa" => 40,
    "Cachos/Ondas" => 30,
    "Escova" => 30,
    "Penteado" => 30,
    "Nanopigmentação" => 120,
    "Design com Henna" => 40,
    "Brow Lamination" => 40,
    "Lash Lifting" => 60,
    "Design Simples" => 30,
    "Maquiagem Express" => 30,
    "Tintura com Tinta da Cliente" => 30,

    ];

    /* VALIDAÇÕES */
    if (!$data || !$horario) {
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Data ou horário não informado."
        ]);
        exit;
    }

    if (!isset($duracoes[$procedimento])) {
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Procedimento inválido."
        ]);
        exit;
    }

    $duracao = $duracoes[$procedimento];

    /* INÍCIO E FIM */
    $inicio = new DateTime("$data $horario");
    $fim = clone $inicio;
    $fim->modify("+$duracao minutes");

    $calendarId = 'luizagues99@gmail.com';

    /* VERIFICA CONFLITO */
    $optParams = [
        'timeMin' => $inicio->format(DateTime::RFC3339),
        'timeMax' => $fim->format(DateTime::RFC3339),
        'singleEvents' => true,
        'orderBy' => 'startTime',
    ];

    $eventos = $service->events->listEvents($calendarId, $optParams);

    if (count($eventos->getItems()) > 0) {
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Esse horário já está ocupado. Por favor, escolha outro horário."
        ]);
        exit;
    }

    /* CRIA EVENTO */
    $evento = new Google_Service_Calendar_Event([

        'summary' => "$procedimento - $nome",

        'description' =>
        "Cliente: $nome
        Telefone: $telefone
        Serviço: $servico
        Procedimento: $procedimento
        [LEMBRETE_PENDENTE]",

        'start' => [
            'dateTime' => $inicio->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo',
        ],

        'end' => [
            'dateTime' => $fim->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo',
        ],

    ]);

    try {

        $service->events->insert($calendarId, $evento);

        echo json_encode([
            "status" => "sucesso",
            "mensagem" => "Agendamento realizado com sucesso! Você receberá confirmação via WhatsApp antes do horário."
        ]);
        exit;

    } catch (Exception $e) {

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Erro ao agendar: " . $e->getMessage()
        ]);
        exit;

    }
}
?>