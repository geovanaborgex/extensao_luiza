<?php

header('Content-Type: application/json; charset=utf-8');
require '../google_calendar.php';
date_default_timezone_set('America/Sao_Paulo');
$calendarId = 'luizagues99@gmail.com';
$acao = $_GET['acao'] ?? '';

/*
====================================================
LISTAR AGENDAMENTOS
====================================================
*/

if ($acao == "listar") {

    if (isset($_GET['inicio']) && isset($_GET['fim'])) {

        $inicioPeriodo = new DateTime($_GET['inicio'] . ' 00:00:00');
        $fimPeriodo = new DateTime($_GET['fim'] . ' 23:59:59');

    } else {

        $hoje = new DateTime('today');

        $diaSemana = (int)$hoje->format('N');

        $inicioPeriodo = (clone $hoje)
            ->modify('-' . ($diaSemana - 1) . ' days');

        $fimPeriodo = (clone $inicioPeriodo)
            ->modify('+6 days')
            ->setTime(23, 59, 59);
    }


    $optParams = [

        'timeMin' => $inicioPeriodo->format(DateTime::RFC3339),

        'timeMax' => $fimPeriodo->format(DateTime::RFC3339),

        'singleEvents' => true,

        'orderBy' => 'startTime'

    ];


    try {

        $eventos = $service->events->listEvents(
            $calendarId,
            $optParams
        );

    } catch (Exception $e) {

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Erro ao buscar agenda: " . $e->getMessage()
        ]);

        exit;
    }


    $lista = [];


    foreach ($eventos->getItems() as $evento) {

        /*
         * =====================================================
         * VERIFICA O TÍTULO DO EVENTO
         * =====================================================
         */

        $summary = trim((string)$evento->getSummary());


        /*
         * Se o evento começar com "BLOQUEAR",
         * ele NÃO será enviado para o listar.
         *
         * Exemplos:
         *
         * BLOQUEAR
         * BLOQUEAR - Almoço
         * BLOQUEAR - Pilates
         * BLOQUEAR - Médico
         * BLOQUEAR - Compromisso
         * BLOQUEAR - qualquer coisa
         */

        if (stripos($summary, 'BLOQUEAR') === 0) {
            continue;
        }


        /*
         * =====================================================
         * INÍCIO E FIM DO EVENTO
         * =====================================================
         */

        $start = $evento->getStart()->getDateTime();

        $end = $evento->getEnd()->getDateTime();


        // Ignora eventos sem horário
        if (!$start || !$end) {
            continue;
        }


        $inicio = new DateTime($start);

        $fim = new DateTime($end);


        /*
         * =====================================================
         * DESCRIÇÃO
         * =====================================================
         */

        $descricao = (string)$evento->getDescription();


        /*
         * =====================================================
         * PROCEDIMENTO E NOME
         * =====================================================
         */

        $procedimento = $summary;

        $nome = "";


        if (strpos($summary, ' - ') !== false) {

            [$procedimento, $nome] = explode(
                ' - ',
                $summary,
                2
            );
        }


        /*
         * =====================================================
         * DADOS
         * =====================================================
         */

        $telefone = "";

        $servico = "";

        $valor = 0;

        $status = "Confirmado";


        /*
         * TELEFONE
         */

        if (preg_match(
            '/Telefone:\s*(.+)/u',
            $descricao,
            $m
        )) {

            $telefone = trim($m[1]);
        }


        /*
         * SERVIÇO
         */

        if (preg_match(
            '/Serviço:\s*(.+)/u',
            $descricao,
            $m
        )) {

            $servico = trim($m[1]);
        }


        /*
         * VALOR
         */

        if (preg_match(
            '/Valor Total:\s*R\$\s*([0-9\.,]+)/i',
            $descricao,
            $m
        )) {

            $valorTexto = trim($m[1]);

            // Remove ponto de milhar
            $valorTexto = str_replace(".", "", $valorTexto);

            // Troca vírgula decimal por ponto
            $valorTexto = str_replace(",", ".", $valorTexto);

            $valor = floatval($valorTexto);
        }


        /*
         * CLIENTE
         */

        if (preg_match(
            '/Cliente:\s*(.+)/u',
            $descricao,
            $m
        )) {

            if (trim($m[1]) != "") {

                $nome = trim($m[1]);
            }
        }


        /*
         * =====================================================
         * ADICIONA NA LISTA
         * =====================================================
         */

        $lista[] = [

            "id" => $evento->getId(),

            "data" => $inicio->format('Y-m-d'),

            "horario" => $inicio->format('H:i'),

            "horarioFim" => $fim->format('H:i'),

            "duracaoMinutos" =>
                (int)(
                    (
                        $fim->getTimestamp()
                        -
                        $inicio->getTimestamp()
                    ) / 60
                ),

            "nome" =>
                $nome != ''
                ? $nome
                : '(sem nome)',

            "telefone" => $telefone,

            "servico" =>
                $servico
                ? $servico
                : trim($procedimento),

            "valor" => $valor,

            "procedimento" =>
                trim($procedimento)

        ];
    }


    /*
     * =========================================================
     * RETORNO JSON
     * =========================================================
     */

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        "status" => "sucesso",
        "agendamentos" => $lista
    ]);

    exit;
}
/*
====================================================
REMARCAR
====================================================
*/
if($acao=="remarcar"){



    if($_SERVER["REQUEST_METHOD"]!="POST"){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"Método inválido"

        ]);

        exit;

    }

    $id =
        $_POST['id'] ?? '';



    $novaData =
        $_POST['data'] ?? '';



    $novoHorario =
        $_POST['horario'] ?? '';


    if(!$id || !$novaData || !$novoHorario){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"Dados incompletos"

        ]);

        exit;
    }

    try{

        $evento =
            $service->events->get(
                $calendarId,
                $id
            );


    }catch(Exception $e){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"Evento não encontrado"

        ]);

        exit;

    }

    $inicioAntigo =
        new DateTime(
            $evento->getStart()->getDateTime()
        );


    $fimAntigo =
        new DateTime(
            $evento->getEnd()->getDateTime()
        );

    $duracao =
        (
            $fimAntigo->getTimestamp()
            -
            $inicioAntigo->getTimestamp()
        ) / 60;



    $novoInicio =
        new DateTime(
            "$novaData $novoHorario"
        );



    $novoFim =
        clone $novoInicio;


    $novoFim->modify("+$duracao minutes");


    // atualiza

    $evento
        ->getStart()
        ->setDateTime(
            $novoInicio->format(DateTime::RFC3339)
        );


    $evento
        ->getStart()
        ->setTimeZone(
            'America/Sao_Paulo'
        );

    $evento
        ->getEnd()
        ->setDateTime(
            $novoFim->format(DateTime::RFC3339)
        );


    $evento
        ->getEnd()
        ->setTimeZone(
            'America/Sao_Paulo'
        );

    try{
        $service->events->update(
            $calendarId,
            $id,
            $evento
        );

        echo json_encode([

            "status"=>"sucesso",

            "mensagem"=>"Atendimento remarcado."

        ]);


    }catch(Exception $e){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>$e->getMessage()

        ]);

    }

    exit;

}

/*
====================================================
CANCELAR
====================================================
*/

if($acao=="cancelar"){

    if($_SERVER["REQUEST_METHOD"]!="POST"){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"Método inválido"

        ]);

        exit;

    }

    $id =
        $_POST['id'] ?? '';

    if(!$id){

        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"ID não informado"

        ]);

        exit;

    }

    try{

        $service->events->delete(

            $calendarId,

            $id

        );

        echo json_encode([

            "status"=>"sucesso",

            "mensagem"=>"Atendimento cancelado."

        ]);

    }catch(Exception $e){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>$e->getMessage()

        ]);

    }

    exit;

}

/*
====================================================
OCUPAR HORÁRIO / CRIAR BLOQUEIO
====================================================
*/
if($acao == "ocupar"){

    header('Content-Type: application/json; charset=utf-8');

    if($_SERVER['REQUEST_METHOD'] !== 'POST'){
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Método inválido."
        ]);
        exit;
    }

    $datasJson = $_POST['datas'] ?? '';
    $horaInicio = trim($_POST['hora_inicio'] ?? '');
    $horaFim = trim($_POST['hora_fim'] ?? '');
    $motivo = trim($_POST['motivo'] ?? '');

    if($datasJson === '' || $horaInicio === '' || $horaFim === ''){
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Dias, horário inicial e horário final são obrigatórios."
        ]);
        exit;
    }

    $datas = json_decode($datasJson, true);

    if(!is_array($datas) || count($datas) === 0){
        echo json_encode([
            "status" => "erro",
            "mensagem" => "Nenhum dia foi selecionado."
        ]);
        exit;
    }

    if($motivo === ''){
        $motivo = "Horário bloqueado";
    }

    // Validação dos horários
    if(!preg_match('/^\d{2}:\d{2}$/', $horaInicio) ||
       !preg_match('/^\d{2}:\d{2}$/', $horaFim)){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Horário inválido."
        ]);
        exit;
    }

    if($horaInicio >= $horaFim){
        echo json_encode([
            "status" => "erro",
            "mensagem" => "O horário final deve ser maior que o horário inicial."
        ]);
        exit;
    }

    $timezone = new DateTimeZone('America/Sao_Paulo');

    /*
     * PRIMEIRO:
     * verificamos todos os dias para evitar criar alguns
     * bloqueios e depois descobrir um conflito.
     */

    $conflitos = [];

    foreach($datas as $data){

        $dataObj = DateTime::createFromFormat(
            'Y-m-d',
            $data,
            $timezone
        );

        if(!$dataObj || $dataObj->format('Y-m-d') !== $data){
            echo json_encode([
                "status" => "erro",
                "mensagem" => "Data inválida: ".$data
            ]);
            exit;
        }

        $inicio = new DateTime(
            $data.' '.$horaInicio.':00',
            $timezone
        );

        $fim = new DateTime(
            $data.' '.$horaFim.':00',
            $timezone
        );

        /*
         * Busca eventos existentes nesse período.
         */
        $optParams = [
            'timeMin' => $inicio->format(DateTime::RFC3339),
            'timeMax' => $fim->format(DateTime::RFC3339),
            'singleEvents' => true,
            'orderBy' => 'startTime'
        ];

        try {

            $eventos = $service->events->listEvents(
                $calendarId,
                $optParams
            );

        } catch(Exception $e){

            echo json_encode([
                "status" => "erro",
                "mensagem" => "Erro ao verificar agenda: ".$e->getMessage()
            ]);
            exit;
        }

        foreach($eventos->getItems() as $evento){

            $eventStart = $evento->getStart()->getDateTime();
            $eventEnd = $evento->getEnd()->getDateTime();

            if(!$eventStart || !$eventEnd){
                continue;
            }

            $eventoInicio = new DateTime($eventStart);
            $eventoFim = new DateTime($eventEnd);

            /*
             * Verifica sobreposição de horários.
             */
            if(
                $inicio < $eventoFim &&
                $fim > $eventoInicio
            ){

                $conflitos[] = [
                    "data" => $data,
                    "evento" => $evento->getSummary() ?: "Evento sem título"
                ];

            }
        }
    }

    /*
     * Se encontrou algum conflito, não cria nenhum bloqueio.
     */
    if(count($conflitos) > 0){

        $mensagem = "Existem horários ocupados:\n\n";

        foreach($conflitos as $conflito){

            $dataFormatada = DateTime::createFromFormat(
                'Y-m-d',
                $conflito['data']
            )->format('d/m/Y');

            $mensagem .= $dataFormatada.
                         " - ".
                         $conflito['evento'].
                         "\n";
        }

        echo json_encode([
            "status" => "conflito",
            "mensagem" => $mensagem
        ]);
        exit;
    }

    /*
     * AGORA SIM:
     * cria os bloqueios em todos os dias.
     */

    $criados = 0;

    foreach($datas as $data){

        $inicio = new DateTime(
            $data.' '.$horaInicio.':00',
            $timezone
        );

        $fim = new DateTime(
            $data.' '.$horaFim.':00',
            $timezone
        );

        $evento = new Google_Service_Calendar_Event([
            'summary' => 'BLOQUEAR - '.$motivo,

            'description' =>
                "Tipo: Bloqueio de horário\n".
                "Motivo: ".$motivo,

            'start' => [
                'dateTime' => $inicio->format(DateTime::RFC3339),
                'timeZone' => 'America/Sao_Paulo'
            ],

            'end' => [
                'dateTime' => $fim->format(DateTime::RFC3339),
                'timeZone' => 'America/Sao_Paulo'
            ]
        ]);

        try {

            $service->events->insert(
                $calendarId,
                $evento
            );

            $criados++;

        } catch(Exception $e){

            echo json_encode([
                "status" => "erro",
                "mensagem" => "Erro ao criar bloqueio: ".$e->getMessage()
            ]);
            exit;
        }
    }

    echo json_encode([
        "status" => "sucesso",
        "mensagem" => $criados." horário(s) bloqueado(s) com sucesso.",
        "quantidade" => $criados
    ]);

    exit;
}

if($acao == "criar_almoco"){

    header('Content-Type: application/json; charset=utf-8');

    $timezone = new DateTimeZone('America/Sao_Paulo');

    // Primeiro dia da recorrência
    $inicio = new DateTime('2026-09-21 10:30:00', $timezone);
    $fim = new DateTime('2026-09-21 13:30:00', $timezone);

    // A recorrência termina em 31/12/2026
    $evento = new Google_Service_Calendar_Event([
        'summary' => 'BLOQUEIO - Almoço',

        'description' =>
            "Tipo: Bloqueio de horário\n".
            "Motivo: Almoço",

        'start' => [
            'dateTime' => $inicio->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],

        'end' => [
            'dateTime' => $fim->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],

        'recurrence' => [
            'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261231T235959Z'
        ]
    ]);

    try {

        $eventoCriado = $service->events->insert(
            $calendarId,
            $evento
        );

        echo json_encode([
            "status" => "sucesso",
            "mensagem" => "Almoço criado de segunda a sexta, das 10:30 às 13:30, até 31/12/2026.",
            "id" => $eventoCriado->getId()
        ]);

    } catch(Exception $e) {

        echo json_encode([
            "status" => "erro",
            "mensagem" => $e->getMessage()
        ]);
    }

    exit;
}

if($acao == "criar_pilates"){

    header('Content-Type: application/json; charset=utf-8');

    $timezone = new DateTimeZone('America/Sao_Paulo');

    // Primeira ocorrência: terça-feira 22/09/2026
    $inicio = new DateTime('2026-09-22 08:00:00', $timezone);
    $fim = new DateTime('2026-09-22 09:00:00', $timezone);

    $evento = new Google_Service_Calendar_Event([
        'summary' => 'BLOQUEAR - Pilates',

        'description' =>
            "Tipo: Bloqueio de horário\n".
            "Motivo: Pilates",

        'start' => [
            'dateTime' => $inicio->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],

        'end' => [
            'dateTime' => $fim->format(DateTime::RFC3339),
            'timeZone' => 'America/Sao_Paulo'
        ],

        'recurrence' => [
            'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z'
        ]
    ]);

    try {

        $eventoCriado = $service->events->insert(
            $calendarId,
            $evento
        );

        echo json_encode([
            "status" => "sucesso",
            "mensagem" => "Pilates criado às terças e quintas, das 08:00 às 09:00, até 31/12/2026.",
            "id" => $eventoCriado->getId()
        ]);

    } catch(Exception $e) {

        echo json_encode([
            "status" => "erro",
            "mensagem" => $e->getMessage()
        ]);
    }

    exit;
}

echo json_encode([

    "status"=>"erro",

    "mensagem"=>"Ação inválida"

]);