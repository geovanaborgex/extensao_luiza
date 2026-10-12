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

function linhasPlanilha(): array
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Procedimentos!A2:F'
    );

    return $resposta->getValues() ?? [];
}

function linhaDoId(string $id, array $linhas): ?int
{
    foreach ($linhas as $indice => $linha) {
        if ((string)($linha[0] ?? '') === $id) {
            // Linha 1 é o cabeçalho; dados começam na linha 2.
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
        "Procedimentos!A{$linha}:F{$linha}",
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
            fn($item) => $item['ativo'] === true
        ));
    }

    responderApi([
        'sucesso' => true,
        'procedimentos' => $procedimentos
    ]);
}

    if ($metodo === 'POST') {
        $servico = trim((string)($dados['servico'] ?? ''));
        $nome = trim((string)($dados['procedimento'] ?? ''));
        $valor = $dados['valor'] ?? null;
        $duracao = $dados['duracao'] ?? null;
        $ativo = filter_var(
            $dados['ativo'] ?? true,
            FILTER_VALIDATE_BOOLEAN
        );

        if (
            $servico === '' || $nome === '' ||
            !is_numeric($valor) || !is_numeric($duracao) ||
            (float)$valor < 0 || (int)$duracao <= 0
        ) {
            responderApi([
                'sucesso' => false,
                'mensagem' => 'Informe categoria, nome, valor válido e duração maior que zero.'
            ], 400);
        }

        $linhas = linhasPlanilha();
        $maiorId = 0;

        foreach ($linhas as $linha) {
            $maiorId = max($maiorId, (int)($linha[0] ?? 0));
        }

        $novoId = (string)($maiorId + 1);

        $corpo = new Google_Service_Sheets_ValueRange([
            'values' => [[
                $novoId,
                $servico,
                $nome,
                (float)$valor,
                (int)$duracao,
                $ativo ? 'TRUE' : 'FALSE'
            ]]
        ]);

        $sheets->spreadsheets_values->append(
            PLANILHA_PROCEDIMENTOS_ID,
            'Procedimentos!A:F',
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

        $valores = [
            $id,
            (string)($linhaAtual[1] ?? ''),
            (string)($linhaAtual[2] ?? ''),
            (float)str_replace(',', '.', (string)($linhaAtual[3] ?? '0')),
            (int)($linhaAtual[4] ?? 0),
            strtoupper((string)($linhaAtual[5] ?? 'TRUE'))
        ];

        if ($metodo === 'DELETE') {
            $valores[5] = 'FALSE';
        } else {
            $servico = trim((string)($dados['servico'] ?? $valores[1]));
            $nome = trim((string)($dados['procedimento'] ?? $valores[2]));
            $valor = $dados['valor'] ?? $valores[3];
            $duracao = $dados['duracao'] ?? $valores[4];
            $ativo = filter_var(
                $dados['ativo'] ?? true,
                FILTER_VALIDATE_BOOLEAN
            );

            if (
                $servico === '' || $nome === '' ||
                !is_numeric($valor) || !is_numeric($duracao) ||
                (float)$valor < 0 || (int)$duracao <= 0
            ) {
                responderApi([
                    'sucesso' => false,
                    'mensagem' => 'Dados inválidos para edição.'
                ], 400);
            }

            $valores = [
                $id,
                $servico,
                $nome,
                (float)$valor,
                (int)$duracao,
                $ativo ? 'TRUE' : 'FALSE'
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
    error_log('Erro na API de procedimentos: ' . $e->getMessage());

    responderApi([
        'sucesso' => false,
        'mensagem' => 'Não foi possível acessar a planilha. Verifique a configuração do Google Sheets.'
    ], 500);
}
