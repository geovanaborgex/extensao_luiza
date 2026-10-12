<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../procedimentos_service.php';

function responderApi(array $dados, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function dadosRequisicao(): array
{
    $json = json_decode(file_get_contents('php://input'), true);
    return is_array($json) ? array_merge($_POST, $json) : $_POST;
}

/**
 * Aceita os nomes do JavaScript e os nomes da planilha.
 */
function normalizarProcedimento(array $dados, array $atuais = []): array
{
    $servico = trim((string)(
        $dados['categoria'] ?? $dados['servico'] ?? $atuais['servico'] ?? ''
    ));

    $nome = trim((string)(
        $dados['nome'] ?? $dados['procedimento'] ?? $atuais['procedimento'] ?? ''
    ));

    $valor = $dados['preco'] ?? $dados['valor'] ?? $atuais['valor'] ?? null;
    $duracao = $dados['duracao'] ?? $atuais['duracao'] ?? null;

    $ativo = filter_var(
        $dados['ativo'] ?? $atuais['ativo'] ?? true,
        FILTER_VALIDATE_BOOLEAN
    );

    if (
        $servico === '' ||
        $nome === '' ||
        $valor === null ||
        $valor === '' ||
        !is_numeric($valor) ||
        !is_numeric($duracao) ||
        !is_finite((float)$valor) ||
        (float)$valor <= 0 ||
        (int)$duracao < 1 ||
        (int)$duracao > 1440 ||
        (float)$duracao !== (float)(int)$duracao
    ) {
        responderApi([
            'sucesso' => false,
            'mensagem' => 'Informe serviço, procedimento, valor maior que zero e duração inteira entre 1 e 1440 minutos.'
        ], 400);
    }

    return [
        'servico' => $servico,
        'procedimento' => $nome,
        'valor' => (float)$valor,
        'duracao' => (int)$duracao,
        'ativo' => $ativo
    ];
}

function linhasPlanilha(): array
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        "'Procedimentos'!A2:F"
    );

    return $resposta->getValues() ?? [];
}

function linhaDoId(string $id, array $linhas): ?int
{
    foreach ($linhas as $indice => $linha) {
        if ((string)($linha[0] ?? '') === $id) {
            return $indice + 2;
        }
    }

    return null;
}

function gravarLinha(int $linha, array $valores): void
{
    $sheets = servicoPlanilha();

    $corpo = new Google_Service_Sheets_ValueRange([
        'values' => [$valores]
    ]);

    $sheets->spreadsheets_values->update(
        PLANILHA_PROCEDIMENTOS_ID,
        "'Procedimentos'!A{$linha}:F{$linha}",
        $corpo,
        ['valueInputOption' => 'USER_ENTERED']
    );
}

try {
    $metodo = $_SERVER['REQUEST_METHOD'];
    $dados = dadosRequisicao();
    $sheets = servicoPlanilha();

    if ($metodo === 'GET') {
        $procedimentos = listarProcedimentosPlanilha();

        if (($_GET['ativos'] ?? '') === '1') {
            $procedimentos = array_values(array_filter(
                $procedimentos,
                fn($item) => filter_var(
                    $item['ativo'] ?? false,
                    FILTER_VALIDATE_BOOLEAN
                )
            ));
        }

        responderApi([
            'sucesso' => true,
            'procedimentos' => $procedimentos
        ]);
    }

    if ($metodo === 'POST') {
        $novo = normalizarProcedimento($dados);
        $linhas = linhasPlanilha();

        $maiorId = 0;

        foreach ($linhas as $linha) {
            $maiorId = max($maiorId, (int)($linha[0] ?? 0));
        }

        $novoId = (string)($maiorId + 1);

        $corpo = new Google_Service_Sheets_ValueRange([
            'values' => [[
                $novoId,
                $novo['servico'],
                $novo['procedimento'],
                $novo['valor'],
                $novo['duracao'],
                $novo['ativo'] ? 'TRUE' : 'FALSE'
            ]]
        ]);

        $sheets->spreadsheets_values->append(
            PLANILHA_PROCEDIMENTOS_ID,
            "'Procedimentos'!A:F",
            $corpo,
            [
                'valueInputOption' => 'USER_ENTERED',
                'insertDataOption' => 'INSERT_ROWS'
            ]
        );

        responderApi([
            'sucesso' => true,
            'mensagem' => 'Procedimento cadastrado.',
            'id' => $novoId
        ], 201);
    }

    if ($metodo === 'PUT' || $metodo === 'DELETE') {
        $id = trim((string)($dados['id'] ?? ''));

        if ($id === '') {
            responderApi([
                'sucesso' => false,
                'mensagem' => 'Informe o ID do procedimento.'
            ], 400);
        }

        $linhas = linhasPlanilha();
        $linhaPlanilha = linhaDoId($id, $linhas);

        if ($linhaPlanilha === null) {
            responderApi([
                'sucesso' => false,
                'mensagem' => 'Procedimento não encontrado.'
            ], 404);
        }

        $linhaAtual = $linhas[$linhaPlanilha - 2];

        $atuais = [
            'servico' => (string)($linhaAtual[1] ?? ''),
            'procedimento' => (string)($linhaAtual[2] ?? ''),
            'valor' => str_replace(
                ',',
                '.',
                (string)($linhaAtual[3] ?? '0')
            ),
            'duracao' => (string)($linhaAtual[4] ?? '0'),
            'ativo' => filter_var(
                $linhaAtual[5] ?? true,
                FILTER_VALIDATE_BOOLEAN
            )
        ];

        if ($metodo === 'DELETE') {
            $atuais['ativo'] = false;

            $valores = [
                $id,
                $atuais['servico'],
                $atuais['procedimento'],
                (float)$atuais['valor'],
                (int)$atuais['duracao'],
                'FALSE'
            ];
        } else {
            $novo = normalizarProcedimento($dados, $atuais);

            $valores = [
                $id,
                $novo['servico'],
                $novo['procedimento'],
                $novo['valor'],
                $novo['duracao'],
                $novo['ativo'] ? 'TRUE' : 'FALSE'
            ];
        }

        gravarLinha($linhaPlanilha, $valores);

        responderApi([
            'sucesso' => true,
            'mensagem' => $metodo === 'DELETE'
                ? 'Procedimento desativado.'
                : 'Procedimento atualizado.'
        ]);
    }

    responderApi([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], 405);

} catch (Throwable $e) {
    error_log(
        'Erro Google Sheets: ' .
        $e->getMessage() .
        ' em ' . $e->getFile() .
        ':' . $e->getLine()
    );

    responderApi([
        'sucesso' => false,
        'mensagem' => 'Falha ao acessar a planilha. Consulte os logs do servidor.'
    ], 500);
}
