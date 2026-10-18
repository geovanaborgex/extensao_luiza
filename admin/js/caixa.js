
"use strict";

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const CHAVE_SESSOES = "luiza_caixa_sessoes_v1";

const API_PRODUTOS = "api/produtos.php";
const API_VENDAS = "api/vendas.php";

const FORMAS_PAGAMENTO = [
    "PIX Nubank",
    "PIX InfinityPay",
    "Dinheiro",
    "Cartão de crédito",
    "Cartão de débito"
];

const $ = id => document.getElementById(id);

let carrinho = [];
let tipoMovimentacaoAtual = "entrada";

let produtosApi = [];
let vendasApi = [];

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function ler(chave, padrao = []) {
    try {
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : padrao;
    } catch (erro) {
        console.error("Erro ao ler:", chave, erro);
        return padrao;
    }
}

function salvar(chave, dados) {
    try {
        localStorage.setItem(chave, JSON.stringify(dados));
    } catch (erro) {
        console.error("Erro ao salvar:", chave, erro);
        mostrarAviso("Não foi possível salvar os dados.", "error");
        throw erro;
    }
}

function obterSessoes() {
    const dados = ler(CHAVE_SESSOES, []);
    return Array.isArray(dados) ? dados : [];
}

function obterProdutos() {
    return produtosApi;
}

function obterVendas() {
    return vendasApi;
}

function numero(valor) {
    if (typeof valor === "string") {
        valor = valor.trim();

        if (valor.includes(",")) {
            valor = valor.replace(/\./g, "").replace(",", ".");
        }
    }

    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : 0;
}

function moeda(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function idNovo() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function hoje() {
    const data = new Date();

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}

function hora(dataHora) {
    if (!dataHora) return "--:--";

    const data = new Date(dataHora);

    if (Number.isNaN(data.getTime())) return "--:--";

    return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function mostrarAviso(mensagem, tipo = "success") {
    if (window.Swal) {
        window.Swal.fire({
            toast: true,
            position: "top-end",
            icon: tipo,
            title: mensagem,
            showConfirmButton: false,
            timer: 2800
        });

        return;
    }

    const toast = $("toast");

    if (toast) {
        toast.textContent = mensagem;
        toast.classList.add("ativo");

        setTimeout(() => toast.classList.remove("ativo"), 3000);
    } else {
        alert(mensagem);
    }
}

/* =========================================================
   COMUNICAÇÃO COM AS APIS
   ========================================================= */

async function requisitarApi(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    const texto = await resposta.text();

    let dados;

    try {
        dados = JSON.parse(texto);
    } catch (erro) {
        console.error("URL chamada:", url);
        console.error("Status HTTP:", resposta.status);
        console.error("Resposta original do servidor:", texto);

        throw new Error(
            `O servidor não retornou JSON válido (HTTP ${resposta.status}). ` +
            `Confira o console e os logs do Render.`
        );
    }

    if (
        !resposta.ok ||
        dados.sucesso === false ||
        dados.erro
    ) {
        throw new Error(
            dados.erro || `Erro na requisição (HTTP ${resposta.status}).`
        );
    }

    return dados;
}


function normalizarProduto(produto) {
    return {
        ...produto,
        id: String(produto.id ?? ""),
        nome: String(
            produto.produto ??
            produto.nome ??
            produto.nomeProduto ??
            produto.descricao ??
            "Produto"
        ),
        preco: numero(
            produto.preco ??
            produto.precoVenda ??
            produto.valor ??
            0
        ),
        estoque: numero(
            produto.estoque ??
            produto.quantidade ??
            produto.qtd ??
            0
        )
    };
}

function normalizarVenda(venda) {
    let itens = [];

    try {
        const produtos = JSON.parse(venda.id_produtos || "[]");

        if (Array.isArray(produtos)) {
            itens = produtos.map(item => ({
                id: String(item.id ?? ""),
                nome: String(
                    item.produto ??
                    item.nome ??
                    "Produto"
                ),
                preco: numero(item.preco),
                quantidade: numero(item.quantidade),
                subtotal:
                    numero(item.preco) * numero(item.quantidade)
            }));
        }
    } catch (erro) {
        console.error(
            "Erro ao interpretar os produtos da venda:",
            erro
        );
    }

    const dataVenda = String(venda.data_venda ?? "");

    return {
        id: String(venda.id ?? ""),
        data: dataVenda.slice(0, 10),
        dataHora: dataVenda.replace(" ", "T"),
        cliente: String(venda.cliente ?? ""),
        pagamento: String(venda.forma_pagamento ?? ""),
        itens,
        total: numero(venda.valor_total)
    };
}

async function carregarProdutosApi() {
    const dados = await requisitarApi(API_PRODUTOS);

    if (!Array.isArray(dados.produtos)) {
        throw new Error(
            "A API não retornou uma lista válida de produtos."
        );
    }

    produtosApi = dados.produtos.map(normalizarProduto);
}

async function carregarVendasApi() {
    const dados = await requisitarApi(API_VENDAS);

    if (!Array.isArray(dados.vendas)) {
        throw new Error(
            "A API não retornou uma lista válida de vendas."
        );
    }

    vendasApi = dados.vendas.map(normalizarVenda);
}

async function carregarDadosApi() {
    await Promise.all([
        carregarProdutosApi(),
        carregarVendasApi()
    ]);
}

/* =========================================================
   MODAIS
   ========================================================= */

function abrirModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.hidden = false;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function fecharModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.hidden = true;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

["modalProdutos", "modalAbertura", "modalMovimentacao"].forEach(id => {
    const modal = $(id);

    if (!modal) return;

    modal.addEventListener("click", evento => {
        if (evento.target !== modal) return;

        if (id === "modalAbertura") return;

        fecharModal(id);
    });
});

document.addEventListener("keydown", evento => {
    if (evento.key !== "Escape") return;

    fecharModal("modalProdutos");
    fecharModal("modalMovimentacao");

    // A abertura é obrigatória quando o caixa está fechado.
    if (caixaAberto()) {
        fecharModal("modalAbertura");
    }
});

/* =========================================================
   CAIXA E ABERTURA
   ========================================================= */

function obterCaixaHoje() {
    return obterSessoes().find(
        sessao => sessao.data === hoje()
    ) || null;
}

function salvarSessao(caixa) {
    const sessoes = obterSessoes();

    const indice = sessoes.findIndex(
        sessao => sessao.data === caixa.data
    );

    if (indice >= 0) {
        sessoes[indice] = caixa;
    } else {
        sessoes.push(caixa);
    }

    salvar(CHAVE_SESSOES, sessoes);
}

function caixaAberto() {
    const caixa = obterCaixaHoje();
    return Boolean(caixa && caixa.aberto);
}

function movimentacoesDoCaixa(caixa) {
    return Array.isArray(caixa?.movimentacoes)
        ? caixa.movimentacoes
        : [];
}

function verificarAberturaCaixa() {
    const aberto = caixaAberto();

    if ($("statusCaixa")) {
        $("statusCaixa").classList.toggle("pill-green", aberto);

        $("statusCaixa").innerHTML = aberto
            ? '<i class="fa-solid fa-circle"></i> Caixa aberto'
            : '<i class="fa-solid fa-circle"></i> Caixa fechado';
    }

    [
        "btnAbrirVenda",
        "btnEntradaManual",
        "btnRetiradaManual"
    ].forEach(id => {
        if ($(id)) {
            $(id).disabled = !aberto;
        }
    });

    if (aberto) {
        fecharModal("modalAbertura");
    } else {
        abrirModal("modalAbertura");
    }

    atualizarResumoCaixa();
}

function abrirCaixa(valorInicial) {
    if (!Number.isFinite(valorInicial) || valorInicial < 0) {
        mostrarAviso("Informe um valor inicial válido.", "error");
        return;
    }

    if (caixaAberto()) {
        mostrarAviso("O caixa de hoje já está aberto.", "info");
        fecharModal("modalAbertura");
        return;
    }

    const caixaAnterior = obterCaixaHoje();

    const caixa = {
        id: caixaAnterior?.id || idNovo(),
        data: hoje(),
        aberto: true,
        valorAbertura: valorInicial,
        dataHoraAbertura: new Date().toISOString(),
        movimentacoes: movimentacoesDoCaixa(caixaAnterior)
    };

    salvarSessao(caixa);

    fecharModal("modalAbertura");
    verificarAberturaCaixa();

    mostrarAviso("Caixa aberto com sucesso!");
}

$("formAbertura")?.addEventListener("submit", evento => {
    evento.preventDefault();

    abrirCaixa(numero($("valorInicialCaixa")?.value));
});

/* =========================================================
   CÁLCULOS FINANCEIROS
   ========================================================= */

function vendasDeHoje() {
    return obterVendas().filter(
        venda => venda.data === hoje()
    );
}

function calcularFinanceiro() {
    const caixa = obterCaixaHoje();
    const movimentacoes = movimentacoesDoCaixa(caixa);
    const vendas = vendasDeHoje();

    const abertura = numero(caixa?.valorAbertura);

    const entradasManuais = movimentacoes
        .filter(movimento => movimento.tipo === "entrada")
        .reduce(
            (soma, movimento) => soma + numero(movimento.valor),
            0
        );

    const retiradas = movimentacoes
        .filter(movimento => movimento.tipo === "retirada")
        .reduce(
            (soma, movimento) => soma + numero(movimento.valor),
            0
        );

    const totalVendas = vendas.reduce(
        (soma, venda) => soma + numero(venda.total),
        0
    );

    const quantidadeVendas = vendas.length;

    // Total recebido = abertura + vendas + entradas manuais.
    // As retiradas não são descontadas deste indicador.
    const totalRecebido =
        abertura + totalVendas + entradasManuais;

    return {
        abertura,
        entradasManuais,
        retiradas,
        totalVendas,
        totalRecebido,
        quantidadeVendas
    };
}

function atualizarResumoCaixa() {
    const resumo = calcularFinanceiro();

    const valores = {
        statVendas: resumo.quantidadeVendas,
        totalVendasDia: moeda(resumo.totalVendas),
        totalRecebido: moeda(resumo.totalRecebido),
        valorAbertura: moeda(resumo.abertura),
        totalEntradas: moeda(resumo.entradasManuais),
        totalRetiradas: moeda(resumo.retiradas)
    };

    Object.entries(valores).forEach(([id, valor]) => {
        if ($(id)) {
            $(id).textContent = valor;
        }
    });

    renderizarMovimentacoes();
    renderizarVendasDoCaixa();
}

/* =========================================================
   ENTRADAS E RETIRADAS MANUAIS
   ========================================================= */

$("btnEntradaManual")?.addEventListener("click", () => {
    if (!caixaAberto()) {
        mostrarAviso("Abra o caixa primeiro.", "warning");
        return;
    }

    tipoMovimentacaoAtual = "entrada";

    if ($("tituloMovimentacao")) {
        $("tituloMovimentacao").textContent = "Registrar entrada";
    }

    if ($("descricaoMovimentacao")) {
        $("descricaoMovimentacao").textContent =
            "Informe o valor adicionado ao caixa.";
    }

    $("formMovimentacao")?.reset();
    abrirModal("modalMovimentacao");
});

$("btnRetiradaManual")?.addEventListener("click", () => {
    if (!caixaAberto()) {
        mostrarAviso("Abra o caixa primeiro.", "warning");
        return;
    }

    tipoMovimentacaoAtual = "retirada";

    if ($("tituloMovimentacao")) {
        $("tituloMovimentacao").textContent = "Registrar retirada";
    }

    if ($("descricaoMovimentacao")) {
        $("descricaoMovimentacao").textContent =
            "Informe o valor retirado do caixa.";
    }

    $("formMovimentacao")?.reset();
    abrirModal("modalMovimentacao");
});

$("cancelarMovimentacao")?.addEventListener("click", () => {
    fecharModal("modalMovimentacao");
});

$("formMovimentacao")?.addEventListener("submit", evento => {
    evento.preventDefault();

    if (!caixaAberto()) {
        mostrarAviso("Abra o caixa primeiro.", "warning");
        return;
    }

    const valor = numero($("valorMovimentacao")?.value);
    const descricao = $("motivoMovimentacao")?.value.trim() || "";

    if (valor <= 0) {
        mostrarAviso("Informe um valor maior que zero.", "warning");
        return;
    }

    if (!descricao) {
        mostrarAviso("Informe a descrição.", "warning");
        return;
    }

    const caixa = obterCaixaHoje();

    if (!caixa) {
        mostrarAviso(
            "Não foi possível localizar o caixa de hoje.",
            "error"
        );
        return;
    }

    caixa.movimentacoes = movimentacoesDoCaixa(caixa);

    caixa.movimentacoes.push({
        id: idNovo(),
        tipo: tipoMovimentacaoAtual,
        descricao,
        valor,
        dataHora: new Date().toISOString()
    });

    salvarSessao(caixa);

    $("formMovimentacao").reset();
    fecharModal("modalMovimentacao");

    atualizarResumoCaixa();

    mostrarAviso(
        tipoMovimentacaoAtual === "entrada"
            ? "Entrada registrada com sucesso!"
            : "Retirada registrada com sucesso!"
    );
});

function renderizarMovimentacoes() {
    const lista = $("listaMovimentacoes");

    if (!lista) return;

    const movimentacoes = movimentacoesDoCaixa(obterCaixaHoje())
        .slice()
        .sort(
            (a, b) =>
                new Date(b.dataHora) - new Date(a.dataHora)
        );

    if (!movimentacoes.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhuma movimentação registrada hoje.
                </td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = movimentacoes.map(movimento => `
        <tr>
            <td>${escapar(hora(movimento.dataHora))}</td>
            <td>
                ${movimento.tipo === "entrada" ? "Entrada" : "Retirada"}
            </td>
            <td>${escapar(movimento.descricao)}</td>
            <td>${moeda(movimento.valor)}</td>
        </tr>
    `).join("");
}

/* =========================================================
   PRODUTOS E ESTOQUE
   ========================================================= */

function nomeDoProduto(produto) {
    return String(
        produto.produto ??
        produto.nome ??
        produto.nomeProduto ??
        produto.descricao ??
        "Produto"
    );
}

function precoDoProduto(produto) {
    return numero(
        produto.preco ??
        produto.precoVenda ??
        produto.valor ??
        0
    );
}

function estoqueDoProduto(produto) {
    return numero(
        produto.estoque ??
        produto.quantidade ??
        produto.qtd ??
        0
    );
}

function atualizarCatalogo() {
    renderizarProdutosModal();
}

function totalCarrinho() {
    return carrinho.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0
    );
}

function atualizarResumoSelecao() {
    const quantidade = carrinho.reduce(
        (soma, item) => soma + item.quantidade,
        0
    );

    if ($("contadorProdutosSelecionados")) {
        $("contadorProdutosSelecionados").textContent =
            `${quantidade} unidade(s) selecionada(s)`;
    }
}

function renderizarCarrinho() {
    const lista = $("carrinho");

    if (!lista) return;

    if (!carrinho.length) {
        lista.innerHTML = `
            <div class="cart-empty">
                Nenhum produto adicionado.
            </div>
        `;
    } else {
        lista.innerHTML = carrinho.map(item => `
            <div class="item-carrinho">
                <div>
                    <strong>${escapar(item.nome)}</strong>
                    <p>${moeda(item.preco)} cada</p>
                </div>

                <div class="controles-quantidade">
                    <button
                        type="button"
                        data-diminuir="${escapar(item.id)}"
                    >−</button>

                    <span>${item.quantidade}</span>

                    <button
                        type="button"
                        data-aumentar="${escapar(item.id)}"
                    >+</button>
                </div>

                <strong>
                    ${moeda(item.preco * item.quantidade)}
                </strong>

                <button
                    type="button"
                    data-remover="${escapar(item.id)}"
                >Remover</button>
            </div>
        `).join("");
    }

    if ($("total")) {
        $("total").textContent = moeda(totalCarrinho());
    }

    atualizarResumoSelecao();
}

function adicionarProduto(id) {
    const produto = obterProdutos().find(
        item => String(item.id) === String(id)
    );

    if (!produto) {
        mostrarAviso(
            "Produto não encontrado no estoque.",
            "error"
        );
        return;
    }

    const item = carrinho.find(
        atual => String(atual.id) === String(id)
    );

    const quantidadeAtual = item?.quantidade || 0;

    if (quantidadeAtual + 1 > estoqueDoProduto(produto)) {
        mostrarAviso("Estoque insuficiente.", "warning");
        return;
    }

    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({
            id: String(produto.id),
            nome: nomeDoProduto(produto),
            preco: precoDoProduto(produto),
            quantidade: 1
        });
    }

    renderizarCarrinho();
    renderizarProdutosModal();
}

function alterarQuantidade(id, quantidade) {
    const item = carrinho.find(
        atual => String(atual.id) === String(id)
    );

    if (!item) return;

    if (quantidade < 1) {
        removerProduto(id);
        return;
    }

    const produto = obterProdutos().find(
        atual => String(atual.id) === String(id)
    );

    if (!produto || quantidade > estoqueDoProduto(produto)) {
        mostrarAviso(
            "Quantidade maior que o estoque disponível.",
            "warning"
        );
        return;
    }

    item.quantidade = quantidade;

    renderizarCarrinho();
    renderizarProdutosModal();
}

function removerProduto(id) {
    carrinho = carrinho.filter(
        item => String(item.id) !== String(id)
    );

    renderizarCarrinho();
    renderizarProdutosModal();
}

$("carrinho")?.addEventListener("click", evento => {
    const menos = evento.target.closest("[data-diminuir]");
    const mais = evento.target.closest("[data-aumentar]");
    const remover = evento.target.closest("[data-remover]");

    if (menos) {
        const item = carrinho.find(
            atual => String(atual.id) === menos.dataset.diminuir
        );

        if (item) {
            alterarQuantidade(item.id, item.quantidade - 1);
        }
    }

    if (mais) {
        const item = carrinho.find(
            atual => String(atual.id) === mais.dataset.aumentar
        );

        if (item) {
            alterarQuantidade(item.id, item.quantidade + 1);
        }
    }

    if (remover) {
        removerProduto(remover.dataset.remover);
    }
});

function renderizarProdutosModal() {
    const lista = $("listaProdutosModal");

    if (!lista) return;

    const termo =
        $("buscarProdutosModal")?.value.trim().toLowerCase() || "";

    const produtos = obterProdutos().filter(produto =>
        nomeDoProduto(produto).toLowerCase().includes(termo)
    );

    if (!produtos.length) {
        lista.innerHTML = `
            <p class="empty">Nenhum produto encontrado.</p>
        `;
        return;
    }

    lista.innerHTML = produtos.map(produto => {
        const item = carrinho.find(
            atual => String(atual.id) === String(produto.id)
        );

        const quantidade = item?.quantidade || 0;
        const estoque = estoqueDoProduto(produto);

        return `
            <div class="produto-modal-item">
                <span class="produto-modal-nome">
                    ${escapar(nomeDoProduto(produto))}
                </span>

                <span>${estoque}</span>

                <span>${moeda(precoDoProduto(produto))}</span>

                <div class="produto-modal-acoes">
                    <button
                        type="button"
                        data-modal-diminuir="${escapar(produto.id)}"
                        ${quantidade <= 0 ? "disabled" : ""}
                    >−</button>

                    <span>${quantidade}</span>

                    <button
                        type="button"
                        data-modal-aumentar="${escapar(produto.id)}"
                        ${quantidade >= estoque ? "disabled" : ""}
                    >+</button>
                </div>
            </div>
        `;
    }).join("");
}

/* =========================================================
   MODAL DE SELEÇÃO DE PRODUTOS
   ========================================================= */

$("btnSelecionarProdutos")?.addEventListener("click", () => {
    if (!caixaAberto()) {
        mostrarAviso(
            "Abra o caixa antes de lançar uma venda.",
            "warning"
        );
        return;
    }

    renderizarProdutosModal();
    abrirModal("modalProdutos");
});

$("buscarProdutosModal")?.addEventListener(
    "input",
    renderizarProdutosModal
);

$("listaProdutosModal")?.addEventListener("click", evento => {
    const mais = evento.target.closest("[data-modal-aumentar]");
    const menos = evento.target.closest("[data-modal-diminuir]");

    if (mais) {
        adicionarProduto(mais.dataset.modalAumentar);
    }

    if (menos) {
        const item = carrinho.find(
            atual => String(atual.id) === menos.dataset.modalDiminuir
        );

        if (item) {
            alterarQuantidade(item.id, item.quantidade - 1);
        }
    }
});

$("fecharModalProdutos")?.addEventListener("click", () => {
    fecharModal("modalProdutos");
});

$("cancelarSelecaoProdutos")?.addEventListener("click", () => {
    fecharModal("modalProdutos");
});

$("concluirSelecaoProdutos")?.addEventListener("click", () => {
    fecharModal("modalProdutos");
    renderizarCarrinho();
});

/* =========================================================
   FORMULÁRIO DE VENDA
   ========================================================= */

$("btnAbrirVenda")?.addEventListener("click", () => {
    if (!caixaAberto()) {
        mostrarAviso(
            "Abra o caixa antes de lançar uma venda.",
            "warning"
        );
        return;
    }

    carrinho = [];

    $("formVenda")?.reset();

    renderizarCarrinho();

    if ($("formularioVenda")) {
        $("formularioVenda").hidden = false;

        $("formularioVenda").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
});

$("btnCancelarVenda")?.addEventListener("click", () => {
    if ($("formularioVenda")) {
        $("formularioVenda").hidden = true;
    }

    carrinho = [];

    $("formVenda")?.reset();

    renderizarCarrinho();
    fecharModal("modalProdutos");
});

$("formVenda")?.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (!caixaAberto()) {
        mostrarAviso(
            "Abra o caixa antes de registrar uma venda.",
            "warning"
        );
        return;
    }

    if (!carrinho.length) {
        mostrarAviso(
            "Selecione pelo menos um produto.",
            "warning"
        );
        return;
    }

    const cliente = $("cliente")?.value.trim() || "";
    const pagamento = $("formaPagamento")?.value || "";

    if (!cliente) {
        mostrarAviso("Informe o nome do cliente.", "warning");
        return;
    }

    if (!FORMAS_PAGAMENTO.includes(pagamento)) {
        mostrarAviso(
            "Selecione uma forma de pagamento.",
            "warning"
        );
        return;
    }

    const formulario = $("formVenda");
    const botaoEnviar = evento.submitter;

    if (formulario?.dataset.enviando === "true") {
        return;
    }

    if (formulario) {
        formulario.dataset.enviando = "true";
    }

    if (botaoEnviar) {
        botaoEnviar.disabled = true;
    }

    try {
        // Atualiza o estoque antes de validar a venda.
        await carregarProdutosApi();

        for (const item of carrinho) {
            const produto = produtosApi.find(
                atual => String(atual.id) === String(item.id)
            );

            if (!produto) {
                mostrarAviso(
                    `O produto "${item.nome}" não foi encontrado.`,
                    "error"
                );
                return;
            }

            if (produto.estoque < item.quantidade) {
                mostrarAviso(
                    `Estoque insuficiente para ${item.nome}. ` +
                    `Disponível: ${produto.estoque}.`,
                    "error"
                );
                return;
            }
        }

        // A API consulta os preços oficiais, calcula o total,
        // registra a venda e atualiza o estoque na planilha.
        const dados = await requisitarApi(API_VENDAS, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cliente,
                forma_pagamento: pagamento,
                produtos: carrinho.map(item => ({
                    id: String(item.id),
                    quantidade: item.quantidade
                }))
            })
        });

        // A API confirmou a gravação. Limpa o formulário mesmo
        // se a atualização visual posterior falhar.
        carrinho = [];

        $("formVenda")?.reset();

        if ($("formularioVenda")) {
            $("formularioVenda").hidden = true;
        }

        fecharModal("modalProdutos");
        renderizarCarrinho();

        try {
            await carregarDadosApi();

            atualizarCatalogo();
            atualizarResumoCaixa();

            mostrarAviso(
                dados.mensagem || "Venda registrada com sucesso!"
            );
        } catch (erroAtualizacao) {
            console.error(
                "A venda foi registrada, mas não foi possível atualizar a tela:",
                erroAtualizacao
            );

            mostrarAviso(
                "Venda registrada! Atualize a página para recarregar os dados.",
                "warning"
            );
        }

    } catch (erro) {
        console.error("Erro ao registrar venda:", erro);

        mostrarAviso(
            erro.message || "Não foi possível registrar a venda.",
            "error"
        );

        // Atualiza o catálogo para mostrar o estoque mais recente.
        try {
            await carregarProdutosApi();
            atualizarCatalogo();
        } catch (erroAtualizacao) {
            console.error(
                "Erro ao atualizar o estoque:",
                erroAtualizacao
            );
        }

    } finally {
        if (formulario) {
            delete formulario.dataset.enviando;
        }

        if (botaoEnviar) {
            botaoEnviar.disabled = false;
        }
    }
});

/* =========================================================
   VENDAS DO DIA
   ========================================================= */

function renderizarVendasDoCaixa() {
    const lista = $("listaVendasCaixa");

    if (!lista) return;

    if ($("dataVendasCaixa")) {
        $("dataVendasCaixa").textContent =
            `Vendas realizadas em ${hoje().split("-").reverse().join("/")}.`;
    }

    if (!caixaAberto()) {
        lista.innerHTML = `
            <tr>
                <td colspan="4">
                    Abra o caixa para visualizar as vendas do dia.
                </td>
            </tr>
        `;
        return;
    }

    const caixa = obterCaixaHoje();

    const abertura = caixa?.dataHoraAbertura
        ? new Date(caixa.dataHoraAbertura).getTime()
        : 0;

    const vendas = vendasDeHoje()
        .filter(venda => {
            if (!venda.dataHora || !abertura) {
                return true;
            }

            const instante = new Date(venda.dataHora).getTime();

            return (
                !Number.isNaN(instante) &&
                instante >= abertura
            );
        })
        .sort(
            (a, b) =>
                new Date(b.dataHora) - new Date(a.dataHora)
        );

    if (!vendas.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhuma venda registrada após a abertura do caixa.
                </td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = vendas.map(venda => `
        <tr>
            <td>${escapar(hora(venda.dataHora))}</td>
            <td>
                ${escapar(venda.cliente || "Cliente não informado")}
            </td>
            <td>${escapar(venda.pagamento || "—")}</td>
            <td>${moeda(venda.total)}</td>
        </tr>
    `).join("");
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function inicializarCaixa() {
    fecharModal("modalProdutos");
    fecharModal("modalMovimentacao");

    renderizarCarrinho();
    verificarAberturaCaixa();

    try {
        await carregarDadosApi();

        atualizarCatalogo();
        atualizarResumoCaixa();

        console.log(
            "Caixa inicializado com produtos e vendas do Google Sheets."
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar produtos e vendas:",
            erro
        );

        mostrarAviso(
            "Não foi possível carregar produtos e vendas. " +
            "Verifique a conexão e as APIs.",
            "error"
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarCaixa);
} else {
    inicializarCaixa();
}
