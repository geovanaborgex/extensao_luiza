<?php

header('Content-Type: application/json; charset=utf-8');
require 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $nome = $_POST["nome"];
    $telefone = $_POST["telefone"];
    $servico = $_POST["servico"];

    $procedimentos = explode(",", $_POST["procedimentos"]);

    $data = $_POST["data"];
    $horario = $_POST["horario"];

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
        "Brow Lamination" => 75,
        "Lash Lifting" => 60,
        "Design Simples" => 30,
        "Maquiagem Express" => 30,
        "Tintura com Tinta da Cliente" => 30,
        "Corte" => 30,
        "Hidratação + Escova" => 70

    ];

    if (!$data || !$horario || empty($procedimentos)) {

        echo json_encode([
            "status"=>"erro",
            "mensagem"=>"Dados inválidos."
        ]);

        exit;
    }

    $duracao = 0;

foreach($procedimentos as $proc){

    $proc = trim($proc);

    if(!isset($duracoes[$proc])){

        echo json_encode([
            "status"=>"erro",
            "mensagem"=>"Procedimento inválido."
        ]);
        exit;
    }

    $duracao += $duracoes[$proc];
}

    $inicio = new DateTime("$data $horario");

    $fim = clone $inicio;
    $fim->modify("+{$duracaoTotal} minutes");

    $calendarId = 'luizagues99@gmail.com';

    $optParams = [

        'timeMin' => $inicio->format(DateTime::RFC3339),
        'timeMax' => $fim->format(DateTime::RFC3339),
        'singleEvents' => true,
        'orderBy' => 'startTime'

    ];

    $eventos = $service->events->listEvents($calendarId,$optParams);

    if(count($eventos->getItems()) > 0){

        echo json_encode([
            "status"=>"erro",
            "mensagem"=>"Esse horário já está ocupado."
        ]);

        exit;

    }

    $listaProcedimentos = implode(" + ",$procedimentos);

    $evento = new Google_Service_Calendar_Event([

        'summary' => implode(" + ", $procedimentos)." - ".$nome,

        'description' =>
        "Cliente: $nome

        Telefone: $telefone

        Serviço: $servico

        Procedimentos: ".implode(", ", $procedimentos)."

        Tempo Total: ".$duracaoTotal." minutos",

        'start'=>[
            'dateTime'=>$inicio->format(DateTime::RFC3339),
            'timeZone'=>'America/Sao_Paulo'
        ],

        'end'=>[
            'dateTime'=>$fim->format(DateTime::RFC3339),
            'timeZone'=>'America/Sao_Paulo'
        ]

    ]);

    try{

        $service->events->insert($calendarId,$evento);

        echo json_encode([
            "status"=>"sucesso",
            "duracao"=>$duracaoTotal
        ]);

    }catch(Exception $e){

        echo json_encode([
            "status"=>"erro",
            "mensagem"=>$e->getMessage()
        ]);

    }

}