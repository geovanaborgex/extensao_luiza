<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../procedimentos_service.php';

function responderVenda(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function corpoJsonVenda(): array
{
    $conteudo = file_get_contents('php://input');
    $dados = json_decode($conteudo ?: '', true);

    if (!is_array($dados)) {
        responderVenda(['erro' => 'Envie os dados da venda em JSON válido.'], 400);
    }

    return $dados;
}

function produtosDaPlanilha(): array
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Produtos!A2:D'
    );

    $produtos = [];

    foreach (($resposta->getValues() ?? []) as $indice => $linha) {
        $id = trim((string)($linha[0] ?? ''));

        if ($id === '') {
            continue;
        }

        $produtos[$id] = [
            'id' => $id,
            'produto' => (string)($linha[1] ?? ''),
            'estoque' => (int)($linha[2] ?? 0),
            'preco' => (float)str_replace(',', '.', (string)($linha[3] ?? '0')),
            'linha' => $indice + 2
        ];
    }

    return $produtos;
}

try {
    $sheets = servicoPlanilha();
    $metodo = $_SERVER['REQUEST_METHOD'];

    if ($metodo === 'GET') {
        $resposta = $sheets->spreadsheets_values->get(
            PLANILHA_PROCEDIMENTOS_ID,
            'Vendas!A2:F'
        );

        $vendas = [];

        foreach (($resposta->getValues() ?? []) as $linha) {
            $vendas[] = [
                'id' => (string)($linha[0] ?? ''),
                'data_venda' => (string)($linha[1] ?? ''),
                'cliente' => (string)($linha[2] ?? ''),
                'valor_total' => (float)str_replace(',', '.', (string)($linha[3] ?? '0')),
                'id_produtos' => (string)($linha[4] ?? ''),
                'forma_pagamento' => (string)($linha[5] ?? '')
            ];
        }

        responderVenda([
            'sucesso' => true,
            'vendas' => $vendas
        ]);
    }

    if ($metodo !== 'POST') {
        header('Allow: GET, POST');
        responderVenda(['erro' => 'Método não permitido.'], 405);
    }

    $dados = corpoJsonVenda();

    $cliente = trim((string)($dados['cliente'] ?? ''));
    $formaPagamento = trim((string)($dados['forma_pagamento'] ?? ''));
    $itens = $dados['produtos'] ?? [];

    $formasPermitidas = [
        'PIX Nubank',
        'PIX InfinityPay',
        'Dinheiro',
        'Cartão de crédito',
        'Cartão de débito'
    ];

    if (!in_array($formaPagamento, $formasPermitidas, true)) {
        responderVenda(['erro' => 'Forma de pagamento inválida.'], 400);
    }

    if (!is_array($itens) || count($itens) === 0) {
        responderVenda(['erro' => 'Adicione pelo menos um produto à venda.'], 400);
    }

    $produtos = produtosDaPlanilha();
    $quantidades = [];
    $total = 0;

    foreach ($itens as $item) {
        $idProduto = trim((string)($item['id'] ?? ''));
        $quantidade = filter_var(
            $item['quantidade'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (
            $idProduto === '' ||
            $quantidade === false ||
            $quantidade < 1
        ) {
            responderVenda(['erro' => 'Produto ou quantidade inválidos.'], 400);
        }

        if (!isset($produtos[$idProduto])) {
            responderVenda([
                'erro' => "Produto não encontrado: {$idProduto}"
            ], 404);
        }

        if (!isset($quantidades[$idProduto])) {
            $quantidades[$idProduto] = 0;
        }

        $quantidades[$idProduto] += $quantidade;
    }

    foreach ($quantidades as $id => $quantidade) {
        $produto = $produtos[$id];

        if ($produto['estoque'] < $quantidade) {
            responderVenda([
                'erro' => "Estoque insuficiente para {$produto['produto']}. Disponível: {$produto['estoque']}."
            ], 409);
        }

        $total += $produto['preco'] * $quantidade;
    }

    // Gera o próximo ID sequencial com base nas vendas já registradas.
    $respostaIds = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Vendas!A2:A'
    );

    $maiorNumero = 0;

    foreach (($respostaIds->getValues() ?? []) as $linhaId) {
        $idExistente = trim((string)($linhaId[0] ?? ''));

        if (preg_match('/^V(\d+)$/', $idExistente, $resultado)) {
            $maiorNumero = max($maiorNumero, (int)$resultado[1]);
        }
    }

    $idVenda = 'V' . str_pad(
        (string)($maiorNumero + 1),
        3,
        '0',
        STR_PAD_LEFT
    );
    $dataVenda = date('Y-m-d H:i:s');

    $produtosVenda = [];

    foreach ($quantidades as $id => $quantidade) {
        $produto = $produtos[$id];

        $produtosVenda[] = [
            'id' => $id,
            'produto' => $produto['produto'],
            'quantidade' => $quantidade,
            'preco' => $produto['preco']
        ];
    }

    $idsProdutosJson = json_encode(
        $produtosVenda,
        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );

    /*
     * Registra a venda na estrutura atual A:F.
     */
    $linhaVenda = new Google_Service_Sheets_ValueRange([
        'values' => [[
            $idVenda,
            $dataVenda,
            $cliente,
            round($total, 2),
            $idsProdutosJson,
            $formaPagamento
        ]]
    ]);

    $sheets->spreadsheets_values->append(
        PLANILHA_PROCEDIMENTOS_ID,
        'Vendas!A:F',
        $linhaVenda,
        [
            'valueInputOption' => 'USER_ENTERED',
            'insertDataOption' => 'INSERT_ROWS'
        ]
    );

    /*
     * Atualiza o estoque dos produtos vendidos.
     */
    $atualizacoes = [];

    foreach ($quantidades as $id => $quantidade) {
        $produto = $produtos[$id];
        $novaQuantidade = $produto['estoque'] - $quantidade;
        $linha = $produto['linha'];

        $atualizacoes[] = new Google_Service_Sheets_ValueRange([
            'range' => "Produtos!C{$linha}",
            'values' => [[$novaQuantidade]]
        ]);
    }

    if (count($atualizacoes) > 0) {
        $sheets->spreadsheets_values->batchUpdate(
            PLANILHA_PROCEDIMENTOS_ID,
            new Google_Service_Sheets_BatchUpdateValuesRequest([
                'valueInputOption' => 'USER_ENTERED',
                'data' => $atualizacoes
            ])
        );
    }

    responderVenda([
        'sucesso' => true,
        'mensagem' => 'Venda registrada com sucesso.',
        'venda' => [
            'id' => $idVenda,
            'data_venda' => $dataVenda,
            'cliente' => $cliente,
            'valor_total' => round($total, 2),
            'id_produtos' => $idsProdutosJson,
            'forma_pagamento' => $formaPagamento
        ]
    ], 201);

} catch (Throwable $e) {
    error_log('Erro na API de vendas: ' . $e->getMessage());

    responderVenda([
        'erro' => 'Não foi possível concluir a operação. Consulte os registros do servidor.'
    ], 500);
}
