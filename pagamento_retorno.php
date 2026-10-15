
<?php
require_once __DIR__ . '/pagamento_service.php';

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    pagamentoResponder([
        'sucesso' => false,
        'mensagem' => 'Método não permitido.'
    ], 405);
}

$pedidoId = trim((string)($_GET['order_nsu'] ?? ''));
$slug = trim((string)($_GET['slug'] ?? ''));
$transacao = trim((string)($_GET['transaction_nsu'] ?? ''));
$comprovante = trim((string)($_GET['receipt_url'] ?? ''));

try {
    $resultado = pagamentoConfirmar(
        $pedidoId,
        $slug,
        $transacao,
        $comprovante
    );

    pagamentoResponder($resultado);

} catch (Throwable $e) {
    error_log(
        'Erro no retorno InfinitePay: ' . $e->getMessage()
    );

    pagamentoResponder([
        'sucesso' => false,
        'mensagem' =>
            'Não foi possível confirmar o pagamento agora. Entre em contato com o salão antes de tentar pagar novamente.'
    ], 500);
}
