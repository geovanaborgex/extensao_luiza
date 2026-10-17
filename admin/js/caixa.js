
"use strict";

/* =========================================================
   CAIXA — LUIZA RODRIGUES BELEZA E ESTÉTICA
   ========================================================= */

const CHAVE_PRODUTOS = "luiza_caixa_produtos_v1";
const CHAVE_VENDAS = "luiza_caixa_vendas_v1";
const CHAVE_SESSOES = "luiza_caixa_sessoes_v1";

const FORMAS_PAGAMENTO = [
    "PIX Nubank",
    "PIX InfinityPay",
    "Dinheiro",
    "Cartão de crédito",
    "Cartão de débito"
];

const $ = (id) => document.getElementById(id);

let carrinho = [];
let selecaoModal = {};
let tipoMovimentacaoAtual = "entrada";

/* =========================================================
   DADOS E UTILITÁRIOS
   ========================================================= */

function carregarDados(chave, padrao = []) {
    try {
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : padrao;
    } catch (erro) {
        console.error(`Erro ao carregar ${chave}:`, erro);
        return padrao;
    }
}

function salvarDados(chave, dados) {
    localStorage.setItem(chave, JSON.stringify(dados));
}

function obterProdutos() {
    return carregarDados(CHAVE_PRODUTOS, []);
}

function obterVendas() {
    return carregarDados(CHAVE_VENDAS, []);
}

function obterSessoes() {
    return carregarDados(CHAVE_SESSOES, []);
}

function dinheiro(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function gerarId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function dataLocal() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function horaLocal(data = new Date()) {
    return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatarData(data) {
    if (!data) return "—";

    const partes = String(data).split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function aviso(mensagem, tipo = "sucesso") {
    if (typeof window.Swal !== "undefined") {
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: tipo,
            title: mensagem,
            showConfirmButton: false,
            timer: 2800,
            timerProgressBar: true
        });

        return;
    }

    alert(mensagem);
}

function confirmar(mensagem) {
    if (typeof window.Swal !== "undefined") {
        return Swal.fire({
            title: "Tem certeza?",
            text: mensagem,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#6B6E55"
        }).then((resultado) => resultado.isConfirmed);
    }

    return Promise.resolve(window.confirm(mensagem));
}

function abrirModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.classList.add("ativo");
    modal.classList.add("aberto");
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function fecharModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("ativo");
    modal.classList.remove("aberto");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

/* =========================================================
   CAIXA DO DIA
   ========================================================= */

function obterCaixaHoje() {
    return obterSessoes().find((sessao) => sessao.data === dataLocal()) || null;
}

function salvarSessao(sessaoAtualizada) {
    const sessoes = obterSessoes();
    const indice = sessoes.findIndex(
        (sessao) => sessao.data === sessaoAtualizada.data
    );

    if (indice >= 0) {
        sessoes[indice] = sessaoAtualizada;
    } else {
        sessoes.push(sessaoAtualizada);
    }

    salvarDados(CHAVE_SESSOES, sessoes);
}

function caixaEstaAberto() {
    const caixa = obterCaixaHoje();
    return Boolean(caixa && caixa.aberto);
}

function verificarAberturaCaixa() {
    const caixa = obterCaixaHoje();

    if (!caixa || !caixa.aberto) {
        if ($("statusCaixa")) {
            $("statusCaixa").textContent = "Caixa fechado";
        }

        if ($("btnAbrirVenda")) {
            $("btnAbrirVenda").disabled = true;
        }

        if ($("btnEntradaManual")) {
            $("btnEntradaManual").disabled = true;
        }

        if ($("btnRetiradaManual")) {
            $("btnRetiradaManual").disabled = true;
        }

        abrirModal("modalAbertura");
        atualizarResumoCaixa();
        return;
    }

    if ($("statusCaixa")) {
        $("statusCaixa").textContent = "Caixa aberto";
    }

    if ($("btnAbrirVenda")) {
        $("btnAbrirVenda").disabled = false;
    }

    if ($("btnEntradaManual")) {
        $("btnEntradaManual").disabled = false;
    }

    if ($("btnRetiradaManual")) {
        $("btnRetiradaManual").disabled = false;
    }

    fecharModal("modalAbertura");
    atualizarResumoCaixa();
}

function abrirCaixa(valorInicial) {
    if (!Number.isFinite(valorInicial) || valorInicial < 0) {
        aviso("Informe um valor inicial válido.", "error");
        return;
    }

    const existente = obterCaixaHoje();

    if (existente && existente.aberto) {
        aviso("O caixa de hoje já está aberto.", "info");
        fecharModal("modalAbertura");
        return;
    }

    const agora = new Date();

    const sessao = {
        id: existente?.id || gerarId(),
        data: dataLocal(),
        aberto: true,
        valorAbertura: valorInicial,
        dataHoraAbertura: agora.toISOString(),
        movimentacoes: existente?.movimentacoes || []
    };

    salvarSessao(sessao);

    fecharModal("modalAbertura");

    if ($("formAbertura")) {
        $("formAbertura").reset();
    }

    verificarAberturaCaixa();
    aviso("Caixa aberto com sucesso!");
}

$("formAbertura")?.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const campo = $("valorInicialCaixa");
    const valor = Number(
        String(campo?.value ?? "0").replace(",", ".")
    );

    abrirCaixa(valor);
});

/* =========================================================
   RESUMO E MOVIMENTAÇÕES DO CAIXA
   ========================================================= */

function obterMovimentacoes(caixa) {
    return Array.isArray(caixa?.movimentacoes)
        ? caixa.movimentacoes
        : [];
}

function calcularResumoCaixa() {
    const caixa = obterCaixaHoje();

    if (!caixa) {
        return {
            abertura: 0,
            entradas: 0,
            retiradas: 0,
            vendasDinheiro: 0,
            saldo: 0
        };
    }

    const movimentacoes = obterMovimentacoes(caixa);

    const entradas = movimentacoes
        .filter((mov) => mov.tipo === "entrada")
        .reduce((total, mov) => total + Number(mov.valor || 0), 0);

    const retiradas = movimentacoes
        .filter((mov) => mov.tipo === "retirada")
        .reduce((total, mov) => total + Number(mov.valor || 0), 0);

    const vendasDinheiro = obterVendas()
        .filter((venda) => {
            if (venda.data !== caixa.data) return false;
            if (venda.pagamento !== "Dinheiro") return false;

            // Contabiliza somente vendas realizadas após a abertura.
            if (venda.dataHora && caixa.dataHoraAbertura) {
                return new Date(venda.dataHora).getTime() >=
                    new Date(caixa.dataHoraAbertura).getTime();
            }

            return true;
        })
        .reduce((total, venda) => total + Number(venda.total || 0), 0);

    const abertura = Number(caixa.valorAbertura || 0);

    return {
        abertura,
        entradas,
        retiradas,
        vendasDinheiro,
        saldo: abertura + entradas + vendasDinheiro - retiradas
    };
}

function renderizarMovimentacoes() {
    const lista = $("listaMovimentacoes");

    if (!lista) return;

    const caixa = obterCaixaHoje();
    const movimentacoes = obterMovimentacoes(caixa)
        .slice()
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    if (!movimentacoes.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="5">Nenhuma movimentação registrada.</td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = movimentacoes.map((mov) => `
        <tr>
            <td>${escapar(horaLocal(new Date(mov.dataHora)))}</td>
            <td>${mov.tipo === "entrada" ? "Entrada" : "Retirada"}</td>
            <td>${escapar(mov.descricao || "Movimentação manual")}</td>
            <td>${dinheiro(mov.valor)}</td>
            <td>
                <button
                    type="button"
                    class="btn-excluir-movimentacao"
                    data-id="${escapar(mov.id)}"
                    aria-label="Excluir movimentação"
                >Excluir</button>
            </td>
        </tr>
    `).join("");
}

function atualizarResumoCaixa() {
    const caixa = obterCaixaHoje();
    const resumo = calcularResumoCaixa();

    if ($("valorAbertura")) {
        $("valorAbertura").textContent = dinheiro(resumo.abertura);
    }

    if ($("totalEntradas")) {
        $("totalEntradas").textContent = dinheiro(resumo.entradas);
    }

    if ($("totalDinheiro")) {
        $("totalDinheiro").textContent = dinheiro(resumo.vendasDinheiro);
    }

    if ($("totalRetiradas")) {
        $("totalRetiradas").textContent = dinheiro(resumo.retiradas);
    }

    if ($("saldoCaixa")) {
        $("saldoCaixa").textContent = dinheiro(resumo.saldo);
    }

    if ($("statTotalCaixa")) {
        $("statTotalCaixa").textContent = dinheiro(resumo.saldo);
    }

    if ($("statusCaixa")) {
        $("statusCaixa").textContent =
            caixa?.aberto ? "Caixa aberto" : "Caixa fechado";
    }

    renderizarMovimentacoes();
    renderizarVendasDoCaixa();
}

function registrarMovimentacao(tipo, descricao, valor) {
    if (!caixaEstaAberto()) {
        aviso("Abra o caixa antes de registrar movimentações.", "warning");
        return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
        aviso("Informe um valor maior que zero.", "error");
        return;
    }

    const caixa = obterCaixaHoje();

    caixa.movimentacoes = obterMovimentacoes(caixa);

    caixa.movimentacoes.push({
        id: gerarId(),
        tipo,
        descricao: descricao.trim() || (
            tipo === "entrada" ? "Entrada manual" : "Retirada manual"
        ),
        valor,
        dataHora: new Date().toISOString()
    });

    salvarSessao(caixa);
    atualizarResumoCaixa();

    aviso(
        tipo === "entrada"
            ? "Entrada registrada com sucesso!"
            : "Retirada registrada com sucesso!"
    );
}

$("btnEntradaManual")?.addEventListener("click", () => {
    tipoMovimentacaoAtual = "entrada";

    if ($("tituloMovimentacao")) {
        $("tituloMovimentacao").textContent = "Registrar entrada";
    }

    if ($("tipoMovimentacao")) {
        $("tipoMovimentacao").value = "entrada";
    }

    abrirModal("modalMovimentacao");
});

$("btnRetiradaManual")?.addEventListener("click", () => {
    tipoMovimentacaoAtual = "retirada";

    if ($("tituloMovimentacao")) {
        $("tituloMovimentacao").textContent = "Registrar retirada";
    }

    if ($("tipoMovimentacao")) {
        $("tipoMovimentacao").value = "retirada";
    }

    abrirModal("modalMovimentacao");
});

$("formMovimentacao")?.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const descricao =
        $("descricaoMovimentacao")?.value ||
        $("motivoMovimentacao")?.value ||
        "";

    const valorCampo = $("valorMovimentacao")?.value;
    const valor = Number(String(valorCampo ?? "").replace(",", "."));

    const tipoCampo = $("tipoMovimentacao")?.value;
    const tipo = tipoCampo === "retirada"
        ? "retirada"
        : tipoMovimentacaoAtual;

    registrarMovimentacao(tipo, descricao, valor);

    fecharModal("modalMovimentacao");
    $("formMovimentacao").reset();
});

$("listaMovimentacoes")?.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("[data-id]");
    if (!botao) return;

    const id = botao.dataset.id;

    const desejaExcluir = await confirmar(
        "Deseja excluir esta movimentação? O saldo será recalculado."
    );

    if (!desejaExcluir) return;

    const caixa = obterCaixaHoje();
    if (!caixa) return;

    caixa.movimentacoes = obterMovimentacoes(caixa).filter(
        (mov) => String(mov.id) !== String(id)
    );

    salvarSessao(caixa);
    atualizarResumoCaixa();
    aviso("Movimentação excluída.");
});

/* =========================================================
   PRODUTOS E ESTOQUE
   ========================================================= */

function renderizarCatalogo() {
    const produtos = obterProdutos();

    if ($("statCatalogo")) {
        $("statCatalogo").textContent = produtos.length;
    }

    if ($("buscaProduto")) {
        renderizarListaProdutos($("buscaProduto").value);
    }
}

function renderizarListaProdutos(busca = "") {
    const lista = $("listaProdutos");
    if (!lista) return;

    const termo = busca.trim().toLowerCase();

    const produtos = obterProdutos().filter((produto) =>
        String(produto.nome || "").toLowerCase().includes(termo)
    );

    if (!produtos.length) {
        lista.innerHTML = `
            <p class="mensagem-vazia">Nenhum produto encontrado.</p>
        `;
        return;
    }

    lista.innerHTML = produtos.map((produto) => `
        <div class="produto-item">
            <div>
                <strong>${escapar(produto.nome)}</strong>
                <p>${dinheiro(produto.preco)} · Estoque: ${Number(produto.estoque || 0)}</p>
            </div>
            <button
                type="button"
                data-adicionar-produto="${escapar(produto.id)}"
                ${Number(produto.estoque || 0) <= 0 ? "disabled" : ""}
            >Adicionar</button>
        </div>
    `).join("");
}

function atualizarCatalogo() {
    renderizarCatalogo();
    renderizarProdutosModal();
}

$("buscaProduto")?.addEventListener("input", (evento) => {
    renderizarListaProdutos(evento.target.value);
});

$("listaProdutos")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-adicionar-produto]");
    if (!botao) return;

    adicionarProduto(botao.dataset.adicionarProduto);
});

function adicionarProduto(id) {
    const produtos = obterProdutos();
    const produto = produtos.find((item) => String(item.id) === String(id));

    if (!produto) {
        aviso("Produto não encontrado.", "error");
        return;
    }

    const itemExistente = carrinho.find(
        (item) => String(item.id) === String(id)
    );

    const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;

    if (quantidadeAtual + 1 > Number(produto.estoque || 0)) {
        aviso("Não há estoque suficiente para esse produto.", "warning");
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco || 0),
            quantidade: 1
        });
    }

    renderizarCarrinho();
    atualizarResumoSelecao();
}

function alterarQuantidade(id, quantidade) {
    const item = carrinho.find(
        (produto) => String(produto.id) === String(id)
    );

    if (!item) return;

    const produtos = obterProdutos();
    const produto = produtos.find(
        (p) => String(p.id) === String(id)
    );

    if (!produto) return;

    const novaQuantidade = Number(quantidade);

    if (!Number.isInteger(novaQuantidade) || novaQuantidade < 1) {
        removerProduto(id);
        return;
    }

    if (novaQuantidade > Number(produto.estoque || 0)) {
        aviso("Quantidade maior que o estoque disponível.", "warning");
        renderizarCarrinho();
        return;
    }

    item.quantidade = novaQuantidade;

    renderizarCarrinho();
    atualizarResumoSelecao();
}

function removerProduto(id) {
    carrinho = carrinho.filter(
        (item) => String(item.id) !== String(id)
    );

    renderizarCarrinho();
    atualizarResumoSelecao();
}

function calcularTotal() {
    return carrinho.reduce(
        (total, item) => total + Number(item.preco) * Number(item.quantidade),
        0
    );
}

function renderizarCarrinho() {
    const lista = $("carrinho");
    if (!lista) return;

    if (!carrinho.length) {
        lista.innerHTML = `
            <p class="mensagem-vazia">Nenhum produto selecionado.</p>
        `;
    } else {
        lista.innerHTML = carrinho.map((item) => `
            <div class="item-carrinho">
                <div>
                    <strong>${escapar(item.nome)}</strong>
                    <p>${dinheiro(item.preco)} cada</p>
                </div>

                <div class="controles-quantidade">
                    <button
                        type="button"
                        data-diminuir="${escapar(item.id)}"
                        aria-label="Diminuir quantidade"
                    >−</button>

                    <input
                        type="number"
                        min="1"
                        value="${Number(item.quantidade)}"
                        data-quantidade="${escapar(item.id)}"
                        aria-label="Quantidade de ${escapar(item.nome)}"
                    >

                    <button
                        type="button"
                        data-aumentar="${escapar(item.id)}"
                        aria-label="Aumentar quantidade"
                    >+</button>
                </div>

                <strong>${dinheiro(item.preco * item.quantidade)}</strong>

                <button
                    type="button"
                    data-remover="${escapar(item.id)}"
                    aria-label="Remover produto"
                >Remover</button>
            </div>
        `).join("");
    }

    if ($("total")) {
        $("total").textContent = dinheiro(calcularTotal());
    }

    if ($("totalVenda")) {
        $("totalVenda").textContent = dinheiro(calcularTotal());
    }
}

$("carrinho")?.addEventListener("click", (evento) => {
    const diminuir = evento.target.closest("[data-diminuir]");
    const aumentar = evento.target.closest("[data-aumentar]");
    const remover = evento.target.closest("[data-remover]");

    if (diminuir) {
        const id = diminuir.dataset.diminuir;
        const item = carrinho.find(
            (produto) => String(produto.id) === String(id)
        );

        if (item) alterarQuantidade(id, item.quantidade - 1);
    }

    if (aumentar) {
        const id = aumentar.dataset.aumentar;
        const item = carrinho.find(
            (produto) => String(produto.id) === String(id)
        );

        if (item) alterarQuantidade(id, item.quantidade + 1);
    }

    if (remover) {
        removerProduto(remover.dataset.remover);
    }
});

$("carrinho")?.addEventListener("change", (evento) => {
    const campo = evento.target.closest("[data-quantidade]");
    if (!campo) return;

    alterarQuantidade(campo.dataset.quantidade, campo.value);
});

/* =========================================================
   MODAL DE SELEÇÃO DE PRODUTOS
   ========================================================= */

function atualizarResumoSelecao() {
    const resumo = $("resumoSelecaoProdutos");

    if (!resumo) return;

    if (!carrinho.length) {
        resumo.innerHTML = "<p>Nenhum produto selecionado ainda.</p>";
        return;
    }

    resumo.innerHTML = `
        <p>
            <strong>${carrinho.reduce((total, item) => total + item.quantidade, 0)}</strong>
            unidade(s) selecionada(s) ·
            <strong>${dinheiro(calcularTotal())}</strong>
        </p>
    `;
}

function renderizarProdutosModal() {
    const lista = $("listaProdutosModal");
    if (!lista) return;

    const busca = $("buscarProdutosModal")?.value?.trim().toLowerCase() || "";

    const produtos = obterProdutos().filter((produto) =>
        String(produto.nome || "").toLowerCase().includes(busca)
    );

    if (!produtos.length) {
        lista.innerHTML = "<p>Nenhum produto encontrado.</p>";
        return;
    }

    lista.innerHTML = produtos.map((produto) => {
        const selecionado = carrinho.find(
            (item) => String(item.id) === String(produto.id)
        );

        const quantidade = selecionado?.quantidade || 0;
        const estoque = Number(produto.estoque || 0);

        return `
            <div class="produto-modal-item">
                <div class="produto-modal-info">
                    <strong>${escapar(produto.nome)}</strong>
                    <span>${dinheiro(produto.preco)}</span>
                    <small>Estoque: ${estoque}</small>
                </div>

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

    if ($("contadorProdutosSelecionados")) {
        $("contadorProdutosSelecionados").textContent =
            String(carrinho.reduce((total, item) => total + item.quantidade, 0));
    }
}

$("btnSelecionarProdutos")?.addEventListener("click", () => {
    if (!caixaEstaAberto()) {
        aviso("Abra o caixa antes de iniciar uma venda.", "warning");
        return;
    }

    renderizarProdutosModal();
    abrirModal("modalProdutos");
});

$("buscarProdutosModal")?.addEventListener("input", renderizarProdutosModal);

$("listaProdutosModal")?.addEventListener("click", (evento) => {
    const aumentar = evento.target.closest("[data-modal-aumentar]");
    const diminuir = evento.target.closest("[data-modal-diminuir]");

    if (aumentar) {
        adicionarProduto(aumentar.dataset.modalAumentar);
    }

    if (diminuir) {
        const id = diminuir.dataset.modalDiminuir;
        const item = carrinho.find(
            (produto) => String(produto.id) === String(id)
        );

        if (item) alterarQuantidade(id, item.quantidade - 1);
    }

    renderizarProdutosModal();
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
    atualizarResumoSelecao();
});

/* =========================================================
   FORMULÁRIO DE VENDA
   ========================================================= */

$("btnAbrirVenda")?.addEventListener("click", () => {
    if (!caixaEstaAberto()) {
        aviso("Abra o caixa antes de iniciar uma venda.", "warning");
        return;
    }

    carrinho = [];
    renderizarCarrinho();
    atualizarResumoSelecao();

    if ($("cliente")) $("cliente").value = "";

    if ($("formaPagamento")) {
        $("formaPagamento").value = FORMAS_PAGAMENTO[0];
    }

    abrirModal("formularioVenda");
});

$("btnCancelarVenda")?.addEventListener("click", () => {
    fecharModal("formularioVenda");
});

$("formVenda")?.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!caixaEstaAberto()) {
        aviso("Abra o caixa antes de registrar uma venda.", "warning");
        return;
    }

    if (!carrinho.length) {
        aviso("Selecione pelo menos um produto.", "warning");
        return;
    }

    const formaPagamento = $("formaPagamento")?.value || "";

    if (!FORMA_PAGAMENTO_VALIDO(formaPagamento)) {
        aviso("Selecione uma forma de pagamento válida.", "warning");
        return;
    }

    const produtos = obterProdutos();

    // Confere novamente o estoque antes de concluir.
    for (const item of carrinho) {
        const produto = produtos.find(
            (p) => String(p.id) === String(item.id)
        );

        if (!produto || Number(produto.estoque || 0) < item.quantidade) {
            aviso(`Estoque insuficiente para ${item.nome}.`, "error");
            return;
        }
    }

    const agora = new Date();

    const novaVenda = {
        id: gerarId(),
        data: dataLocal(),
        dataHora: agora.toISOString(),
        cliente: $("cliente")?.value?.trim() || "Cliente não informado",
        pagamento: formaPagamento,
        itens: carrinho.map((item) => ({
            id: item.id,
            nome: item.nome,
            preco: Number(item.preco),
            quantidade: Number(item.quantidade),
            subtotal: Number(item.preco) * Number(item.quantidade)
        })),
        total: calcularTotal()
    };

    // Dá baixa no estoque.
    for (const item of carrinho) {
        const produto = produtos.find(
            (p) => String(p.id) === String(item.id)
        );

        produto.estoque = Number(produto.estoque || 0) - item.quantidade;
    }

    salvarDados(CHAVE_PRODUTOS, produtos);

    const vendas = obterVendas();
    vendas.push(novaVenda);
    salvarDados(CHAVE_VENDAS, vendas);

    carrinho = [];

    $("formVenda")?.reset();
    fecharModal("formularioVenda");
    fecharModal("modalProdutos");

    renderizarCarrinho();
    atualizarResumoSelecao();
    atualizarCatalogo();
    renderizarVendas();
    atualizarResumoCaixa();

    aviso("Venda registrada com sucesso!");
});

function FORMA_PAGAMENTO_VALIDO(forma) {
    return FORMAS_PAGAMENTO.includes(forma);
}

/* =========================================================
   VENDAS DO DIA — APÓS A ABERTURA DO CAIXA
   ========================================================= */

function renderizarVendasDoCaixa() {
    const lista = $("listaVendasCaixa");
    if (!lista) return;

    const caixa = obterCaixaHoje();

    if ($("dataVendasCaixa")) {
        $("dataVendasCaixa").textContent =
            `Data: ${formatarData(caixa?.data || dataLocal())}`;
    }

    if (!caixa || !caixa.aberto) {
        lista.innerHTML = `
            <tr>
                <td colspan="5">Abra o caixa para visualizar as vendas do dia.</td>
            </tr>
        `;
        return;
    }

    const abertura = caixa.dataHoraAbertura
        ? new Date(caixa.dataHoraAbertura).getTime()
        : 0;

    const vendas = obterVendas()
        .filter((venda) => {
            if (venda.data !== caixa.data) return false;

            if (venda.dataHora && abertura) {
                return new Date(venda.dataHora).getTime() >= abertura;
            }

            return true;
        })
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    if (!vendas.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="5">Nenhuma venda registrada após a abertura do caixa.</td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = vendas.map((venda) => `
        <tr>
            <td>${escapar(venda.dataHora ? horaLocal(new Date(venda.dataHora)) : "—")}</td>
            <td>${escapar(venda.cliente || "Cliente não informado")}</td>
            <td>${escapar(venda.pagamento || "—")}</td>
            <td>${dinheiro(venda.total)}</td>
            <td>${escapar(venda.itens?.length || 0)} item(ns)</td>
        </tr>
    `).join("");
}

/* =========================================================
   HISTÓRICO GERAL DE VENDAS
   Compatível com páginas que tenham esses filtros.
   ========================================================= */

function renderizarVendas() {
    const lista = $("listaVendas");
    const statVendas = $("statVendas");
    const statTotal = $("statTotal");

    const dataInicial = $("dataInicial")?.value || "";
    const dataFinal = $("dataFinal")?.value || "";

    let vendas = obterVendas().slice();

    if (dataInicial) {
        vendas = vendas.filter((venda) => venda.data >= dataInicial);
    }

    if (dataFinal) {
        vendas = vendas.filter((venda) => venda.data <= dataFinal);
    }

    vendas.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    if (statVendas) {
        statVendas.textContent = obterVendas().length;
    }

    if (statTotal) {
        statTotal.textContent = dinheiro(
            vendas.reduce((total, venda) => total + Number(venda.total || 0), 0)
        );
    }

    if (!lista) return;

    if (!vendas.length) {
        lista.innerHTML = `
            <tr>
                <td colspan="7">Nenhuma venda encontrada.</td>
            </tr>
        `;
        return;
    }

    lista.innerHTML = vendas.map((venda) => `
        <tr>
            <td>${formatarData(venda.data)}</td>
            <td>${escapar(venda.dataHora ? horaLocal(new Date(venda.dataHora)) : "—")}</td>
            <td>${escapar(venda.cliente || "Cliente não informado")}</td>
            <td>${escapar(venda.pagamento || "—")}</td>
            <td>${dinheiro(venda.total)}</td>
            <td>${escapar(venda.itens?.length || 0)}</td>
            <td>
                <button
                    type="button"
                    data-excluir-venda="${escapar(venda.id)}"
                >Excluir</button>
            </td>
        </tr>
    `).join("");
}

$("btnFiltrar")?.addEventListener("click", renderizarVendas);

$("btnLimparFiltro")?.addEventListener("click", () => {
    if ($("dataInicial")) $("dataInicial").value = "";
    if ($("dataFinal")) $("dataFinal").value = "";

    renderizarVendas();
});

$("listaVendas")?.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-excluir-venda]");
    if (!botao) return;

    excluirVenda(botao.dataset.excluirVenda);
});

/* =========================================================
   EXCLUIR VENDA E DEVOLVER ESTOQUE
   ========================================================= */

async function excluirVenda(id) {
    const desejaExcluir = await confirmar(
        "Deseja excluir esta venda? Os produtos vendidos voltarão ao estoque."
    );

    if (!desejaExcluir) return;

    const vendas = obterVendas();
    const venda = vendas.find(
        (item) => String(item.id) === String(id)
    );

    if (!venda) {
        aviso("Venda não encontrada.", "error");
        return;
    }

    const produtos = obterProdutos();

    for (const item of venda.itens || []) {
        const produto = produtos.find(
            (p) => String(p.id) === String(item.id)
        );

        if (produto) {
            produto.estoque =
                Number(produto.estoque || 0) + Number(item.quantidade || 0);
        }
    }

    salvarDados(CHAVE_PRODUTOS, produtos);

    salvarDados(
        CHAVE_VENDAS,
        vendas.filter((item) => String(item.id) !== String(id))
    );

    atualizarCatalogo();
    renderizarVendas();
    atualizarResumoCaixa();

    aviso("Venda excluída e estoque atualizado.");
}

/* =========================================================
   BOTÕES PARA FECHAR MODAIS
   ========================================================= */

document.querySelectorAll("[data-fechar-modal]").forEach((botao) => {
    botao.addEventListener("click", () => {
        fecharModal(botao.dataset.fecharModal);
    });
});

$("fecharModalVenda")?.addEventListener("click", () => {
    fecharModal("formularioVenda");
});

$("fecharModalMovimentacao")?.addEventListener("click", () => {
    fecharModal("modalMovimentacao");
});

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    renderizarCarrinho();
    atualizarResumoSelecao();
    atualizarCatalogo();
    renderizarVendas();
    verificarAberturaCaixa();
    atualizarResumoCaixa();
});
