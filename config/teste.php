<?php
$conn = new mysqli("127.0.0.1", "root", "root");

if ($conn->connect_error) {
    die("Erro: " . $conn->connect_error);
}

echo "Conectou no MySQL!";
?>