
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../procedimentos_service.php';

function responder(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function requisicaoJson(): array
{
    $conteudo = file_get_contents('php://input');

    if (!$conteudo) {
        return [];
    }

    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        responder(['erro' => 'JSON inválido.'], 400);
    }

    return $dados;
}

function listarProdutos(): array
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Produtos!A2:D'
    );

    $linhas = $resposta->getValues() ?? [];
    $produtos = [];

    foreach ($linhas as $linha) {
        $id = trim((string)($linha[0] ?? ''));

        if ($id === '') {
            continue;
        }

        $produtos[] = [
            'id' => $id,
            'produto' => (string)($linha[1] ?? ''),
            'estoque' => (int)($linha[2] ?? 0),
            'preco' => (float)str_replace(
                ',',
                '.',
                (string)($linha[3] ?? '0')
            )
        ];
    }

    return $produtos;
}

function localizarLinhaProduto(string $id): ?int
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Produtos!A2:A'
    );

    $ids = $resposta->getValues() ?? [];

    foreach ($ids as $indice => $linha) {
        if (trim((string)($linha[0] ?? '')) === $id) {
            return $indice + 2;
        }
    }

    return null;
}

function validarProduto(array $dados): array
{
    $produto = trim((string)($dados['produto'] ?? ''));

    if ($produto === '') {
        responder(['erro' => 'Informe o nome do produto.'], 400);
    }

    if (
        !isset($dados['estoque']) ||
        filter_var($dados['estoque'], FILTER_VALIDATE_INT) === false ||
        (int)$dados['estoque'] < 0
    ) {
        responder(['erro' => 'O estoque deve ser um inteiro igual ou maior que zero.'], 400);
    }

    if (!isset($dados['preco']) || !is_numeric($dados['preco']) || (float)$dados['preco'] < 0) {
        responder(['erro' => 'Informe um preço válido.'], 400);
    }

    return [
        'produto' => $produto,
        'estoque' => (int)$dados['estoque'],
        'preco' => (float)$dados['preco']
    ];
}

try {
    $metodo = $_SERVER['REQUEST_METHOD'];
    $sheets = servicoPlanilha();

    if ($metodo === 'GET') {
        responder([
            'sucesso' => true,
            'produtos' => listarProdutos()
        ]);
    }

    $dados = requisicaoJson();

    if ($metodo === 'POST') {
        $produto = validarProduto($dados);
        $id = trim((string)($dados['id'] ?? ''));

        if ($id === '') {
            $id = 'P' . bin2hex(random_bytes(6));
        }

        if (localizarLinhaProduto($id) !== null) {
            responder(['erro' => 'Já existe um produto com esse ID.'], 409);
        }

        $valores = new Google_Service_Sheets_ValueRange([
            'values' => [[
                $id,
                $produto['produto'],
                $produto['estoque'],
                $produto['preco']
            ]]
        ]);

        $sheets->spreadsheets_values->append(
            PLANILHA_PROCEDIMENTOS_ID,
            'Produtos!A:D',
            $valores,
            ['valueInputOption' => 'USER_ENTERED', 'insertDataOption' => 'INSERT_ROWS']
        );

        responder([
            'sucesso' => true,
            'mensagem' => 'Produto cadastrado.',
            'produto' => array_merge(['id' => $id], $produto)
        ], 201);
    }

    if ($metodo === 'PUT') {
        $id = trim((string)($dados['id'] ?? ''));

        if ($id === '') {
            responder(['erro' => 'Informe o ID do produto.'], 400);
        }

        $linha = localizarLinhaProduto($id);

        if ($linha === null) {
            responder(['erro' => 'Produto não encontrado.'], 404);
        }

        $produto = validarProduto($dados);

        $valores = new Google_Service_Sheets_ValueRange([
            'values' => [[
                $id,
                $produto['produto'],
                $produto['estoque'],
                $produto['preco']
            ]]
        ]);

        $sheets->spreadsheets_values->update(
            PLANILHA_PROCEDIMENTOS_ID,
            "Produtos!A{$linha}:D{$linha}",
            $valores,
            ['valueInputOption' => 'USER_ENTERED']
        );

        responder([
            'sucesso' => true,
            'mensagem' => 'Produto atualizado.',
            'produto' => array_merge(['id' => $id], $produto)
        ]);
    }

    if ($metodo === 'DELETE') {
        $id = trim((string)($dados['id'] ?? ''));

        if ($id === '') {
            responder(['erro' => 'Informe o ID do produto.'], 400);
        }

        $linha = localizarLinhaProduto($id);

        if ($linha === null) {
            responder(['erro' => 'Produto não encontrado.'], 404);
        }

        $sheets->spreadsheets_values->clear(
            PLANILHA_PROCEDIMENTOS_ID,
            "Produtos!A{$linha}:D{$linha}",
            new Google_Service_Sheets_ClearValuesRequest()
        );

        responder([
            'sucesso' => true,
            'mensagem' => 'Produto removido.'
        ]);
    }

    header('Allow: GET, POST, PUT, DELETE');
    responder(['erro' => 'Método não permitido.'], 405);

} catch (Throwable $e) {
    error_log('Erro na API de produtos: ' . $e->getMessage());

    responder([
        'erro' => 'Não foi possível processar os produtos. Verifique os registros do servidor.'
    ], 500);
}
