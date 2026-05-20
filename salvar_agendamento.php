<?php

header('Content-Type: application/json; charset=utf-8');
require 'google_calendar.php';
date_default_timezone_set('America/Sao_Paulo');

if($_SERVER["REQUEST_METHOD"] == "POST"){

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

/* VERIFICA SE O PROCEDIMENTO EXISTE - VAZIO OU INVÁLIDO */

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

/* INÍCIO */

$inicio = new DateTime("$data $horario");

/* FIM */

$fim = clone $inicio;
$fim->modify("+$duracao minutes");

/* GOOGLE */

$calendarId = 'geovanaborges304@gmail.com';

/* BUSCA EVENTOS DO HORÁRIO */

$optParams = [
'timeMin' => $inicio->format(DateTime::RFC3339),
'timeMax' => $fim->format(DateTime::RFC3339),
'singleEvents' => true,
'orderBy' => 'startTime',
];

$eventos = $service->events->listEvents($calendarId, $optParams);

/* VERIFICA CONFLITO */

if(count($eventos->getItems()) > 0){

echo json_encode([
    "status" => "erro",
    "mensagem" => "Esse horário já está ocupado. Por favor, escolha outro horário."
]);
exit;

exit;

}

/* CRIA EVENTO */

$evento = new Google_Service_Calendar_Event([

'summary' => "$procedimento - $nome",

'description' =>
"Cliente: $nome
Telefone: $telefone
Serviço: $servico
Procedimento: $procedimento",

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
        "mensagem" => "Você irá receber uma mensagem de confirmação no número informado um dia antes do procedimento. Em caso de desistência, nos chame no WhatsApp."
    ]);
    exit;

} catch (Exception $e) {
    echo json_encode([
        "status" => "erro",
        "mensagem" => "Não foi possível realizar o agendamento. Erro: " . $e->getMessage()
    ]);
    exit;
}

}
?>