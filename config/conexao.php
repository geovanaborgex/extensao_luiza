<?php

$host = "localhost";
$usuario = "root";
$senha = "root"; 
$banco = "extensao_luiza";

// cria conexão
$conn = new mysqli("127.0.0.1:3307", "root", "", "extensao_luiza");

// verifica erro
if ($conn->connect_error) {
    die("Erro na conexão: " . $conn->connect_error);
}

// opcional (recomendado)
$conn->set_charset("utf8");