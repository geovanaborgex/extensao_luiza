<?php

while (true) {

    try {

        // chama seu lembrete
        require __DIR__ . '/lembretewpp.php';

        echo "Executado: " . date('H:i:s') . PHP_EOL;

    } catch (Exception $e) {
        echo "Erro: " . $e->getMessage() . PHP_EOL;
    }

    // espera 5 minutos
    sleep(300);
}