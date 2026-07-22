<?php

header('Content-Type: application/json; charset=utf-8');

require 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');


$calendarId = 'luizagues99@gmail.com';

$acao = $_GET['acao'] ?? '';



/*
====================================================
LISTAR AGENDAMENTOS
====================================================
*/

if($acao == "listar"){


    if (isset($_GET['inicio']) && isset($_GET['fim'])) {

        $inicioPeriodo = new DateTime($_GET['inicio'] . ' 00:00:00');
        $fimPeriodo = new DateTime($_GET['fim'] . ' 23:59:59');

    } else {


        $hoje = new DateTime('today');

        $diaSemana = (int)$hoje->format('N');


        $inicioPeriodo =
            (clone $hoje)
            ->modify('-'.($diaSemana - 1).' days');


        $fimPeriodo =
            (clone $inicioPeriodo)
            ->modify('+6 days')
            ->setTime(23,59,59);

    }



    $optParams = [

        'timeMin' => $inicioPeriodo->format(DateTime::RFC3339),

        'timeMax' => $fimPeriodo->format(DateTime::RFC3339),

        'singleEvents'=>true,

        'orderBy'=>'startTime'

    ];



    try {


        $eventos =
            $service->events->listEvents(
                $calendarId,
                $optParams
            );


    } catch(Exception $e){


        echo json_encode([

            "status"=>"erro",

            "mensagem"=>"Erro ao buscar agenda: ".$e->getMessage()

        ]);

        exit;

    }



    $lista=[];



    foreach($eventos->getItems() as $evento){


        $start =
            $evento->getStart()->getDateTime();


        $end =
            $evento->getEnd()->getDateTime();



        // ignora evento sem horário

        if(!$start || !$end){
            continue;
        }



        $inicio =
            new DateTime($start);


        $fim =
            new DateTime($end);



        $summary =
            (string)$evento->getSummary();



        $descricao =
            (string)$evento->getDescription();



        /*
          Formato:
          Serviço - Cliente
        */


        $procedimento=$summary;

        $nome="";



        if(strpos($summary,' - ')!==false){


            [$procedimento,$nome] =
                explode(' - ',$summary,2);

        }



        $telefone="";

        $servico="";



        if(preg_match(
            '/Telefone:\s*(.+)/u',
            $descricao,
            $m
        )){

            $telefone=trim($m[1]);

        }



        if(preg_match(
            '/Serviço:\s*(.+)/u',
            $descricao,
            $m
        )){

            $servico=trim($m[1]);

        }



        if(preg_match(
            '/Cliente:\s*(.+)/u',
            $descricao,
            $m
        )){

            if(trim($m[1])!=""){

                $nome=trim($m[1]);

            }

        }




        $lista[]=[

            "id"=>$evento->getId(),

            "data"=>$inicio->format('Y-m-d'),

            "horario"=>$inicio->format('H:i'),

            "horarioFim"=>$fim->format('H:i'),


            "duracaoMinutos"=>
                (int)(
                    ($fim->getTimestamp()
                    -
                    $inicio->getTimestamp())
                    /
                    60
                ),


            "nome"=>
                $nome!=''
                ?
                $nome
                :
                '(sem nome)',


            "telefone"=>$telefone,


            "servico"=>
                $servico
                ?:
                trim($procedimento),


            "procedimento"=>
                trim($procedimento)

        ];

    }



    echo json_encode([

        "status"=>"sucesso",

        "agendamentos"=>$lista

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





echo json_encode([

    "status"=>"erro",

    "mensagem"=>"Ação inválida"

]);