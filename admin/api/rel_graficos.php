<?php

header('Content-Type: application/json; charset=utf-8');

require '../google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

$calendarId = 'luizagues99@gmail.com';

$ano = isset($_GET['ano']) ? (int)$_GET['ano'] : (int)date('Y');

if ($ano < 2020 || $ano > 2100) {
    echo json_encode([
        "status" => "erro",
        "mensagem" => "Ano inválido."
    ]);
    exit;
}

try {

    /*
    ============================================================
    PERÍODO DO ANO
    ============================================================
    */

    $inicioPeriodo = new DateTime(
        $ano . '-01-01 00:00:00',
        new DateTimeZone('America/Sao_Paulo')
    );

    $fimPeriodo = new DateTime(
        ($ano + 1) . '-01-01 00:00:00',
        new DateTimeZone('America/Sao_Paulo')
    );

    /*
    ============================================================
    BUSCA TODOS OS EVENTOS
    ============================================================
    */

    $eventosTodos = [];

    $pageToken = null;

    do {

        $optParams = [
            'timeMin' => $inicioPeriodo->format(DateTime::RFC3339),
            'timeMax' => $fimPeriodo->format(DateTime::RFC3339),
            'singleEvents' => true,
            'orderBy' => 'startTime',
            'maxResults' => 2500
        ];

        if ($pageToken) {
            $optParams['pageToken'] = $pageToken;
        }

        $eventos = $service->events->listEvents(
            $calendarId,
            $optParams
        );

        foreach ($eventos->getItems() as $evento) {
            $eventosTodos[] = $evento;
        }

        $pageToken = $eventos->getNextPageToken();

    } while ($pageToken);


    /*
    ============================================================
    ESTRUTURAS DOS RELATÓRIOS
    ============================================================
    */

    $totalAgendamentos = 0;
    $faturamentoTotal = 0;

    $clientes = [];

    $procedimentos = [];

    $agendamentosMes = array_fill(1, 12, 0);
    $faturamentoMes = array_fill(1, 12, 0);

    $diasSemana = [
        'Domingo' => 0,
        'Segunda-feira' => 0,
        'Terça-feira' => 0,
        'Quarta-feira' => 0,
        'Quinta-feira' => 0,
        'Sexta-feira' => 0,
        'Sábado' => 0
    ];

    $horarios = [];

    $listaAgendamentos = [];


    /*
    ============================================================
    PERCORRE OS EVENTOS
    ============================================================
    */

    foreach ($eventosTodos as $evento) {

        $summary = trim((string)$evento->getSummary());

        /*
        ------------------------------------------------------------
        IGNORA BLOQUEIOS
        ------------------------------------------------------------
        */

        if (stripos($summary, 'BLOQUEAR') === 0) {
            continue;
        }


        /*
        ------------------------------------------------------------
        DATA / HORÁRIO
        ------------------------------------------------------------
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
        ------------------------------------------------------------
        DESCRIÇÃO
        ------------------------------------------------------------
        */

        $descricao = (string)$evento->getDescription();


        /*
        ------------------------------------------------------------
        PROCEDIMENTO
        ------------------------------------------------------------
        */

        $procedimento = $summary;

        $nome = '';

        if (strpos($summary, ' - ') !== false) {

            [$procedimento, $nome] = explode(
                ' - ',
                $summary,
                2
            );
        }


        /*
        ------------------------------------------------------------
        TELEFONE
        ------------------------------------------------------------
        */

        $telefone = '';

        if (preg_match(
            '/Telefone:\s*(.+)/u',
            $descricao,
            $m
        )) {
            $telefone = trim($m[1]);
        }


        /*
        ------------------------------------------------------------
        SERVIÇO
        ------------------------------------------------------------
        */

        $servico = '';

        if (preg_match(
            '/Serviço:\s*(.+)/u',
            $descricao,
            $m
        )) {
            $servico = trim($m[1]);
        }


        /*
        ------------------------------------------------------------
        VALOR
        ------------------------------------------------------------
        */

        $valor = 0;

        if (preg_match(
            '/Valor Total:\s*R\$\s*([0-9\.,]+)/i',
            $descricao,
            $m
        )) {

            $valorTexto = trim($m[1]);

            $valorTexto = str_replace('.', '', $valorTexto);

            $valorTexto = str_replace(',', '.', $valorTexto);

            $valor = (float)$valorTexto;
        }


        /*
        ------------------------------------------------------------
        CLIENTE
        ------------------------------------------------------------
        */

        if (preg_match(
            '/Cliente:\s*(.+)/u',
            $descricao,
            $m
        )) {

            if (trim($m[1]) !== '') {
                $nome = trim($m[1]);
            }
        }

        if ($nome === '') {
            $nome = '(sem nome)';
        }


        /*
        ============================================================
        INDICADORES
        ============================================================
        */

        $totalAgendamentos++;

        $faturamentoTotal += $valor;


        /*
        ------------------------------------------------------------
        CLIENTES
        ------------------------------------------------------------
        */

        if ($nome !== '(sem nome)') {

            $chaveCliente = mb_strtolower(
                trim($nome),
                'UTF-8'
            );

            if (!isset($clientes[$chaveCliente])) {

                $clientes[$chaveCliente] = [
                    'nome' => $nome,
                    'agendamentos' => 0,
                    'faturamento' => 0
                ];
            }

            $clientes[$chaveCliente]['agendamentos']++;
            $clientes[$chaveCliente]['faturamento'] += $valor;
        }


        /*
        ------------------------------------------------------------
        PROCEDIMENTOS
        ------------------------------------------------------------
        */

        $servicoFinal = $servico !== ''
            ? $servico
            : trim($procedimento);

        if ($servicoFinal === '') {
            $servicoFinal = 'Não informado';
        }

        if (!isset($procedimentos[$servicoFinal])) {
            $procedimentos[$servicoFinal] = [
                'nome' => $servicoFinal,
                'quantidade' => 0,
                'faturamento' => 0
            ];
        }

        $procedimentos[$servicoFinal]['quantidade']++;
        $procedimentos[$servicoFinal]['faturamento'] += $valor;


        /*
        ------------------------------------------------------------
        MÊS
        ------------------------------------------------------------
        */

        $mes = (int)$inicio->format('n');

        $agendamentosMes[$mes]++;
        $faturamentoMes[$mes] += $valor;


        /*
        ------------------------------------------------------------
        DIA DA SEMANA
        ------------------------------------------------------------
        */

        $numeroDia = (int)$inicio->format('w');

        $nomesDias = [
            0 => 'Domingo',
            1 => 'Segunda-feira',
            2 => 'Terça-feira',
            3 => 'Quarta-feira',
            4 => 'Quinta-feira',
            5 => 'Sexta-feira',
            6 => 'Sábado'
        ];

        $diaNome = $nomesDias[$numeroDia];

        $diasSemana[$diaNome]++;


        /*
        ------------------------------------------------------------
        HORÁRIO
        ------------------------------------------------------------
        */

        $hora = $inicio->format('H:00');

        if (!isset($horarios[$hora])) {
            $horarios[$hora] = 0;
        }

        $horarios[$hora]++;


        /*
        ------------------------------------------------------------
        GUARDA AGENDAMENTO
        ------------------------------------------------------------
        */

        $listaAgendamentos[] = [
            'id' => $evento->getId(),
            'data' => $inicio->format('Y-m-d'),
            'horario' => $inicio->format('H:i'),
            'nome' => $nome,
            'telefone' => $telefone,
            'servico' => $servicoFinal,
            'valor' => $valor
        ];
    }


    /*
    ============================================================
    ORDENA CLIENTES
    ============================================================
    */

    $clientesLista = array_values($clientes);

    usort(
        $clientesLista,
        function ($a, $b) {
            return $b['agendamentos'] <=> $a['agendamentos'];
        }
    );


    /*
    ============================================================
    ORDENA PROCEDIMENTOS
    ============================================================
    */

    $procedimentosLista = array_values($procedimentos);

    usort(
        $procedimentosLista,
        function ($a, $b) {
            return $b['quantidade'] <=> $a['quantidade'];
        }
    );


    /*
    ============================================================
    ORDENA HORÁRIOS
    ============================================================
    */

    ksort($horarios);


    /*
    ============================================================
    TOP PROCEDIMENTO
    ============================================================
    */

    $topProcedimento = null;

    if (count($procedimentosLista) > 0) {

        $topProcedimento = $procedimentosLista[0];
    }


    /*
    ============================================================
    TOP CLIENTE
    ============================================================
    */

    $topCliente = null;

    if (count($clientesLista) > 0) {

        $topCliente = $clientesLista[0];
    }


    /*
    ============================================================
    MÊS COM MAIS AGENDAMENTOS
    ============================================================
    */

    $mesesNomes = [
        1 => 'Janeiro',
        2 => 'Fevereiro',
        3 => 'Março',
        4 => 'Abril',
        5 => 'Maio',
        6 => 'Junho',
        7 => 'Julho',
        8 => 'Agosto',
        9 => 'Setembro',
        10 => 'Outubro',
        11 => 'Novembro',
        12 => 'Dezembro'
    ];

    $mesMaiorMovimento = 1;

    for ($i = 2; $i <= 12; $i++) {

        if (
            $agendamentosMes[$i] >
            $agendamentosMes[$mesMaiorMovimento]
        ) {
            $mesMaiorMovimento = $i;
        }
    }


    /*
    ============================================================
    DIA MAIS MOVIMENTADO
    ============================================================
    */

    $diaMaisMovimentado = '';

    if (count($diasSemana) > 0) {

        $diaMaisMovimentado = array_keys(
            $diasSemana,
            max($diasSemana)
        )[0];
    }


    /*
    ============================================================
    HORÁRIO MAIS MOVIMENTADO
    ============================================================
    */

    $horarioMaisMovimentado = '';

    if (count($horarios) > 0) {

        $horarioMaisMovimentado = array_keys(
            $horarios,
            max($horarios)
        )[0];
    }


    /*
    ============================================================
    RETORNO
    ============================================================
    */

    echo json_encode([
        'status' => 'sucesso',

        'ano' => $ano,

        'resumo' => [
            'totalAgendamentos' => $totalAgendamentos,

            'faturamentoTotal' => round(
                $faturamentoTotal,
                2
            ),

            'clientesUnicos' => count($clientes),

            'ticketMedio' => $totalAgendamentos > 0
                ? round(
                    $faturamentoTotal / $totalAgendamentos,
                    2
                )
                : 0
        ],

        'destaques' => [
            'procedimentoMaisRealizado' => $topProcedimento,

            'clienteMaisFrequente' => $topCliente,

            'mesMaisMovimentado' => [
                'mes' => $mesesNomes[$mesMaiorMovimento],
                'numero' => $mesMaiorMovimento,
                'quantidade' => $agendamentosMes[$mesMaiorMovimento]
            ],

            'diaMaisMovimentado' => [
                'dia' => $diaMaisMovimentado,
                'quantidade' => $diaMaisMovimentado !== ''
                    ? $diasSemana[$diaMaisMovimentado]
                    : 0
            ],

            'horarioMaisMovimentado' => [
                'horario' => $horarioMaisMovimentado,
                'quantidade' => $horarioMaisMovimentado !== ''
                    ? $horarios[$horarioMaisMovimentado]
                    : 0
            ]
        ],

        'graficos' => [

            'meses' => [
                'labels' => array_values($mesesNomes),
                'agendamentos' => array_values($agendamentosMes),
                'faturamento' => array_values($faturamentoMes)
            ],

            'procedimentos' => $procedimentosLista,

            'clientes' => $clientesLista,

            'diasSemana' => [
                'labels' => array_keys($diasSemana),
                'valores' => array_values($diasSemana)
            ],

            'horarios' => [
                'labels' => array_keys($horarios),
                'valores' => array_values($horarios)
            ]
        ],

        'agendamentos' => $listaAgendamentos
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {

    echo json_encode([
        'status' => 'erro',
        'mensagem' => $e->getMessage()
    ]);
}