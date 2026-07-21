 <?php
/*
require 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

$calendarId = 'geovanaborges304@gmail.com';

$inicio = new DateTime('now');
$fim = (clone $inicio)->modify('+24 hours');

$eventos = $service->events->listEvents($calendarId, [
    'timeMin' => $inicio->format(DateTime::RFC3339),
    'timeMax' => $fim->format(DateTime::RFC3339),
    'singleEvents' => true,
    'orderBy' => 'startTime',
]);

foreach ($eventos->getItems() as $evento) {

    $descricao = $evento->description ?? '';

    /* ❌ só pega eventos pendentes *//*
    if (strpos($descricao, '[LEMBRETE_PENDENTE]') === false) {
        continue;
    }

    /* ❌ evita duplicar envio *//*
    if (strpos($descricao, '[LEMBRETE_ENVIADO]') !== false) {
        continue;
    }

preg_match('/Telefone:\s*(.+)/', $descricao, $matches);
preg_match('/Procedimento:\s*(.+)/', $descricao, $procMatch);

if (!isset($matches[1])) {
    continue;
}

$telefone = preg_replace('/[^0-9]/', '', $matches[1]);

if (substr($telefone, 0, 2) !== '55') {
    $telefone = '55' . $telefone;
}

$procedimento = $procMatch[1] ?? 'seu atendimento';

$mensagem = "Oi 💚\n"
. "Passando para te lembrar do seu atendimento de $procedimento\n\n"
. "Qualquer imprevisto, me chama aqui no WhatsApp ✨";


    /* 📡 API ULTRAMSG *//*
    $url = "https://api.ultramsg.com/instance176224/messages/chat";

    file_get_contents($url, false, stream_context_create([
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded",
            'method'  => 'POST',
            'content' => http_build_query([
                'token' => 'e6tiqpy5ix2wenoo',
                'to' => $telefone,
                'body' => $mensagem
            ])
        ]
    ]));

    /* ✅ marca como enviado *//*
    $evento->setDescription($descricao . "\n\n[LEMBRETE_ENVIADO]");

    $service->events->update(
        $calendarId,
        $evento->getId(),
        $evento
    );

    echo "Lembrete enviado para: $telefone\n";
    
    */
