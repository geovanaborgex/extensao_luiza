
<?php
require_once __DIR__ . '/google_calendar.php';

const PLANILHA_PROCEDIMENTOS_ID =
    '1qCcyDo4NEWUaX3H66-RpKQb6KttsQAlIzyc5q-9r6Ec';

function servicoPlanilha(): Google_Service_Sheets
{
    global $client;

    return new Google_Service_Sheets($client);
}

function listarProcedimentosPlanilha(): array
{
    $sheets = servicoPlanilha();

    $resposta = $sheets->spreadsheets_values->get(
        PLANILHA_PROCEDIMENTOS_ID,
        'Procedimentos!A2:F'
    );

    $linhas = $resposta->getValues() ?? [];
    $procedimentos = [];

    foreach ($linhas as $linha) {
        $id = trim((string)($linha[0] ?? ''));
        $servico = trim((string)($linha[1] ?? ''));
        $nome = trim((string)($linha[2] ?? ''));
        $valor = (float)str_replace(
            ',',
            '.',
            (string)($linha[3] ?? '0')
        );
        $duracao = (int)($linha[4] ?? 0);
        $ativoOriginal = strtolower(
            trim((string)($linha[5] ?? ''))
        );

        $ativo = in_array(
            $ativoOriginal,
            ['true', '1', 'sim', 'ativo'],
            true
        );

        if ($id === '' || $servico === '' || $nome === '') {
            continue;
        }

        $procedimentos[] = [
            'id' => $id,
            'servico' => $servico,
            'procedimento' => $nome,
            'valor' => $valor,
            'duracao' => $duracao,
            'ativo' => $ativo
        ];
    }

    return $procedimentos;
}

function buscarProcedimentosAtivos(array $nomes): array
{
    $todos = listarProcedimentosPlanilha();
    $encontrados = [];

    foreach ($nomes as $nome) {
        $nome = trim((string)$nome);
        $encontrado = null;

        foreach ($todos as $item) {
            if (
                $item['procedimento'] === $nome &&
                $item['ativo'] === true
            ) {
                $encontrado = $item;
                break;
            }
        }

        if ($nome === '' || $encontrado === null) {
            throw new InvalidArgumentException(
                'Procedimento inválido ou inativo: ' . $nome
            );
        }

        $encontrados[] = $encontrado;
    }

    return $encontrados;
}
