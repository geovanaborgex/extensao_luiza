
<?php
require_once __DIR__ . '/pagamento_service.php';

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pagamentoResponder([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], 405);

    exit;
}

$corpo = file_get_contents('php://input');
$dados = json_decode($corpo, true);

if (!is_array($dados)) {
    pagamentoResponder([
        'sucesso' => false,
        'mensagem' => 'JSON inválido.'
    ], 400);

    exit;
}

$pedidoId = trim((string)($dados['order_nsu'] ?? ''));
$slug = trim((string)($dados['invoice_slug'] ?? $dados['slug'] ?? ''));
$transacao = trim((string)($dados['transaction_nsu'] ?? ''));
$comprovante = trim((string)($dados['receipt_url'] ?? ''));

if ($pedidoId === '' || $slug === '' || $transacao === '') {
    pagamentoResponder([
        'sucesso' => false,
        'mensagem' => 'Dados da notificação incompletos.'
    ], 400);

    exit;
}

try {
    $resultado = pagamentoConfirmar(
        $pedidoId,
        $slug,
        $transacao,
        $comprovante
    );

    if (!($resultado['sucesso'] ?? false)) {
        pagamentoResponder($resultado, 400);
        exit;
    }

    pagamentoResponder([
        'sucesso' => true
    ], 200);

} catch (Throwable $e) {
    error_log(
        'Erro no webhook InfinitePay: ' . $e->getMessage()
    );

    pagamentoResponder([
        'sucesso' => false,
        'mensagem' => 'Não foi possível processar a notificação.'
    ], 500);
}
