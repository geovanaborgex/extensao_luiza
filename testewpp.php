<?php

$url = "https://api.ultramsg.com/instance176224/messages/chat";

$dados = [

'token' => 'e6tiqpy5ix2wenoo',
'to' => '5537998420727',
'body' => 'Teste enviado pelo sistema 🚀'

];

$options = [
'http' => [
'header'  => "Content-type: application/x-www-form-urlencoded",
'method'  => 'POST',
'content' => http_build_query($dados)
]
];

$context = stream_context_create($options);

echo file_get_contents($url, false, $context);