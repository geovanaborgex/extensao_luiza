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

    if($_SERVER["REQUEST_METHOD"] != "POST"){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Método inválido"
        ]);

        exit;
    }

    $dataInicio = $_POST['data_inicio'] ?? '';
    $dataFim = $_POST['data_fim'] ?? '';

    $horaInicio = $_POST['hora_inicio'] ?? '';
    $horaFim = $_POST['hora_fim'] ?? '';

    $motivo = trim($_POST['motivo'] ?? '');


    if(!$dataInicio || !$dataFim || !$horaInicio || !$horaFim){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Data inicial, data final, horário inicial e horário final são obrigatórios."
        ]);

        exit;
    }


    if(!$motivo){
        $motivo = "Horário bloqueado";
    }


    /*
    ==================================================
    VALIDA DATAS
    ==================================================
    */

    try{

        $periodoInicio = new DateTime(
            $dataInicio . ' 00:00:00',
            new DateTimeZone('America/Sao_Paulo')
        );

        $periodoFim = new DateTime(
            $dataFim . ' 00:00:00',
            new DateTimeZone('America/Sao_Paulo')
        );

    }catch(Exception $e){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "Data inválida."
        ]);

        exit;
    }


    if($periodoFim < $periodoInicio){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "A data final deve ser igual ou posterior à data inicial."
        ]);

        exit;
    }


    /*
    ==================================================
    VALIDA HORÁRIOS
    ==================================================
    */

    if($horaFim <= $horaInicio){

        echo json_encode([
            "status" => "erro",
            "mensagem" => "O horário final deve ser maior que o horário inicial."
        ]);

        exit;
    }


    /*
    ==================================================
    PRIMEIRO:
    VERIFICA TODOS OS DIAS ANTES DE CRIAR QUALQUER
    BLOQUEIO
    ==================================================
    */

    $dias = [];

    $dataAtual = clone $periodoInicio;


    while($dataAtual <= $periodoFim){

        $dataString = $dataAtual->format('Y-m-d');


        $inicio = new DateTime(
            "$dataString $horaInicio",
            new DateTimeZone('America/Sao_Paulo')
        );

        $fim = new DateTime(
            "$dataString $horaFim",
            new DateTimeZone('America/Sao_Paulo')
        );


        $optParams = [

            'timeMin' => $inicio->format(DateTime::RFC3339),

            'timeMax' => $fim->format(DateTime::RFC3339),

            'singleEvents' => true,

            'orderBy' => 'startTime'

        ];


        try{

            $eventos = $service->events->listEvents(
                $calendarId,
                $optParams
            );

        }catch(Exception $e){

            echo json_encode([
                "status" => "erro",
                "mensagem" => "Erro ao verificar a agenda: " . $e->getMessage()
            ]);

            exit;
        }


        /*
        ==============================================
        VERIFICA CONFLITO
        ==============================================
        */

        foreach($eventos->getItems() as $evento){

            $inicioEvento = $evento->getStart()->getDateTime();
            $fimEvento = $evento->getEnd()->getDateTime();


            if(!$inicioEvento || !$fimEvento){
                continue;
            }


            $inicioExistente = new DateTime($inicioEvento);
            $fimExistente = new DateTime($fimEvento);


            if(
                $inicio < $fimExistente &&
                $fim > $inicioExistente
            ){

                echo json_encode([

                    "status" => "erro",

                    "mensagem" =>
                        "Já existe um agendamento ou bloqueio no dia " .
                        $dataAtual->format('d/m/Y') .
                        " entre " .
                        $horaInicio .
                        " e " .
                        $horaFim .
                        "."

                ]);

                exit;
            }
        }


        /*
        ==============================================
        GUARDA O DIA PARA CRIAR DEPOIS
        ==============================================
        */

        $dias[] = [
            "inicio" => $inicio,
            "fim" => $fim
        ];


        $dataAtual->modify('+1 day');
    }


    /*
    ==================================================
    SEGUNDO:
    CRIA OS BLOQUEIOS
    ==================================================
    */

    $ids = [];


    try{

        foreach($dias as $dia){

            $inicio = $dia["inicio"];
            $fim = $dia["fim"];


            $evento = new Google_Service_Calendar_Event([

                'summary' => 'BLOQUEAR - ' . $motivo,

                'description' =>
                    "Tipo: Bloqueio de horário\n" .
                    "Motivo: " . $motivo,

                'start' => [

                    'dateTime' =>
                        $inicio->format(DateTime::RFC3339),

                    'timeZone' =>
                        'America/Sao_Paulo'

                ],

                'end' => [

                    'dateTime' =>
                        $fim->format(DateTime::RFC3339),

                    'timeZone' =>
                        'America/Sao_Paulo'

                ]

            ]);


            $novoEvento =
                $service->events->insert(
                    $calendarId,
                    $evento
                );


            $ids[] = $novoEvento->getId();
        }


        /*
        ==============================================
        RETORNO
        ==============================================
        */

        $quantidade = count($ids);


        echo json_encode([

            "status" => "sucesso",

            "mensagem" =>
                $quantidade == 1
                ? "Horário bloqueado com sucesso."
                : $quantidade . " dias bloqueados com sucesso.",

            "ids" => $ids

        ]);

    }catch(Exception $e){

        echo json_encode([

            "status" => "erro",

            "mensagem" =>
                "Erro ao criar bloqueio: " .
                $e->getMessage()

        ]);
    }


    exit;
}


echo json_encode([

    "status"=>"erro",

    "mensagem"=>"Ação inválida"

]);