<?php

require 'google_calendar.php';

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

"Spa dos pés" => 60,

"Limpeza de pele" => 75,

"Tintura com tinta profissional" => 30,

"Chapa" => 60,

"Cachos/ondas" => 30,

"Escova" => 30,

"Penteado" => 30,

"Nanopigmentação" => 120,

"Design com henna" => 30,

"Brow Lamination" => 60,

"Lash Lifting" => 90,

"Design simples" => 30

];

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

echo "
<h2 style='font-family:Poppins;color:red;text-align:center'>
Esse horário já está ocupado 😢
</h2>
";

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

$service->events->insert($calendarId, $evento);

echo "<html>
<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>

<script>
Swal.fire({
    icon: 'success',
    title: 'Agendamento realizado com sucesso!',
    html: `
        <p style='font-size:14px; color:#555;'>
            Você irá receber uma mensagem de confirmação no número informado
            um dia antes do procedimento.<br><br>

            Em caso de desistência, nos chamar no WhatsApp.
        </p>
    `,
    confirmButtonText: 'OK'
});
</script></html>
";

}
?>