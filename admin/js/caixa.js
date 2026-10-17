
"use strict";

// ======================================================
// CONFIGURAÇÕES E DADOS
// ======================================================

const CHAVE_PRODUTOS = "luiza_caixa_produtos_v1";
const CHAVE_VENDAS = "luiza_caixa_vendas_v1";
const CHAVE_CAIXAS = "luiza_caixa_sessoes_v1";

let sessoesCaixa = carregarDados(CHAVE_CAIXAS, []);
let tipoMovimentacaoAtual = "entrada";

function obterCaixaHoje() {
    const hoje = dataLocal();
    return sessoesCaixa.find(caixa => caixa.data === hoje) || null;
}

function salvarSessoesCaixa() {
    return salvarDados(CHAVE_CAIXAS, sessoesCaixa);
}

function moedaParaNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

const produtosIniciais = [
    { id: 1, nome: "Shampoo Hidratante", preco: 45.00, estoque: 12, emoji: "🧴" },
    { id: 2, nome: "Máscara Capilar", preco: 62.90, estoque: 3, emoji: "🫙" },
    { id: 3, nome: "Óleo Finalizador", preco: 39.90, estoque: 8, emoji: "✨" },
    { id: 4, nome: "Leave-in Protetor", preco: 54.00, estoque: 0, emoji: "🌿" }
];

const formasPagamento = [
    "PIX Nubank",
    "PIX InfinityPay",
    "Dinheiro",
    "Cartão de crédito",
    "Cartão de débito"
];

let produtos = carregarDados(CHAVE_PRODUTOS, produtosIniciais);
let vendas = carregarDados(CHAVE_VENDAS, []);
let carrinho = {};

// Seleção temporária do modal.
// Só é aplicada ao carrinho ao clicar em "Concluir seleção".
let selecaoModal = {};
let temporizadorAviso;

const dinheiro = valor =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

function carregarDados(chave, padrao) {
    try {
        const salvo = localStorage.getItem(chave);
        return salvo ? JSON.parse(salvo) : structuredClone(padrao);
    } catch (erro) {
        console.error("Erro ao carregar " + chave, erro);
        return structuredClone(padrao);
    }
}

function salvarDados(chave, dados) {
    try {
        localStorage.setItem(chave, JSON.stringify(dados));
        return true;
    } catch (erro) {
        console.error("Erro ao salvar " + chave, erro);
        aviso("Não foi possível salvar os dados neste navegador.");
        return false;
    }
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function dataLocal(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
    if (!data) return "—";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function gerarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ======================================================
// ELEMENTOS DO HTML
// ======================================================

const $ = id => document.getElementById(id);

const menuToggle = $("menuToggle");
const menuOverlay = $("menuOverlay");

const btnAbrirVenda = $("btnAbrirVenda");
const btnCancelarVenda = $("btnCancelarVenda");
const formularioVenda = $("formularioVenda");
const formVenda = $("formVenda");

const btnSelecionarProdutos = $("btnSelecionarProdutos");
const modalProdutos = $("modalProdutos");
const fecharModalProdutos = $("fecharModalProdutos");
const cancelarSelecaoProdutos = $("cancelarSelecaoProdutos");
const concluirSelecaoProdutos = $("concluirSelecaoProdutos");

const buscarProdutosModal = $("buscarProdutosModal");
const listaProdutosModal = $("listaProdutosModal");
const contadorProdutosSelecionados = $("contadorProdutosSelecionados");
const resumoSelecaoProdutos = $("resumoSelecaoProdutos");

const clienteInput = $("cliente");
const pagamentoInput = $("formaPagamento");
const carrinhoElemento = $("carrinho");
const totalElemento = $("total");

const statCatalogo = $("statCatalogo");
const statVendas = $("statVendas");
const statTotal = $("statTotal");
const statTotalCaixa = $("statTotalCaixa");

const dataInicialInput = $("dataInicial");
const dataFinalInput = $("dataFinal");
const listaVendas = $("listaVendas");

const statusCaixa = $("statusCaixa");
const modalAbertura = $("modalAbertura");
const formAbertura = $("formAbertura");
const valorInicialCaixa = $("valorInicialCaixa");

const modalMovimentacao = $("modalMovimentacao");
const formMovimentacao = $("formMovimentacao");
const valorMovimentacao = $("valorMovimentacao");
const motivoMovimentacao = $("motivoMovimentacao");

const btnEntradaManual = $("btnEntradaManual");
const btnRetiradaManual = $("btnRetiradaManual");
const cancelarMovimentacao = $("cancelarMovimentacao");

const valorAberturaEl = $("valorAbertura");
const totalEntradasEl = $("totalEntradas");
const totalDinheiroEl = $("totalDinheiro");
const totalRetiradasEl = $("totalRetiradas");
const saldoCaixaEl = $("saldoCaixa");
const listaMovimentacoes = $("listaMovimentacoes");

// ======================================================
// MENU RESPONSIVO
// ======================================================

menuToggle?.addEventListener("click", () => {
    document.body.classList.toggle("menu-aberto");
});

menuOverlay?.addEventListener("click", () => {
    document.body.classList.remove("menu-aberto");
});

// ======================================================
// ABRIR E CANCELAR VENDA
// ======================================================

btnAbrirVenda.addEventListener("click", () => {
    formularioVenda.hidden = false;

    formularioVenda.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    clienteInput.focus({ preventScroll: true });
});

btnCancelarVenda.addEventListener("click", cancelarVenda);

function cancelarVenda() {
    carrinho = {};
    selecaoModal = {};

    formVenda.reset();
    fecharModal();

    renderizarCarrinho();
    atualizarResumoSelecao();

    formularioVenda.hidden = true;
}

// ======================================================
// MODAL DE SELEÇÃO DE PRODUTOS
// ======================================================

function abrirModal() {
    // Começa com os itens que já estão no carrinho.
    selecaoModal = { ...carrinho };

    buscarProdutosModal.value = "";

    renderizarProdutosModal();
    modalProdutos.classList.add("aberto");
    modalProdutos.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-produtos-aberto");

    buscarProdutosModal.focus();
}

function fecharModal() {
    modalProdutos.classList.remove("aberto");
    modalProdutos.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-produtos-aberto");
}

btnSelecionarProdutos.addEventListener("click", abrirModal);
fecharModalProdutos.addEventListener("click", fecharModal);
cancelarSelecaoProdutos.addEventListener("click", fecharModal);

modalProdutos.addEventListener("click", evento => {
    if (evento.target === modalProdutos) {
        fecharModal();
    }
});

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" &&
        modalProdutos.classList.contains("aberto")) {
        fecharModal();
    }
});

buscarProdutosModal.addEventListener("input", renderizarProdutosModal);


function renderizarProdutosModal() {
    const busca = buscarProdutosModal.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const encontrados = produtos.filter(produto =>
        produto.nome.toLocaleLowerCase("pt-BR").includes(busca)
    );

    if (!encontrados.length) {
        listaProdutosModal.innerHTML = `
            <div class="empty">
                Nenhum produto encontrado.
            </div>
        `;
        return;
    }

    listaProdutosModal.innerHTML = encontrados.map(produto => {
        const quantidade = selecaoModal[produto.id] || 0;
        const indisponivel = produto.estoque <= 0;

        return `
            <div class="linha-produto-modal">
                <div class="coluna-nome-produto">
                    <span class="emoji-produto">
                        ${escapar(produto.emoji || "📦")}
                    </span>
                    <span>${escapar(produto.nome)}</span>
                </div>

                <div class="coluna-estoque">
                    <span class="${indisponivel ? "estoque-zero" : ""}">
                        ${produto.estoque} un.
                    </span>
                </div>

                <div class="coluna-preco">
                    ${dinheiro(produto.preco)}
                </div>

                <div class="coluna-quantidade">
                    <button
                        type="button"
                        class="btn-quantidade"
                        data-diminuir-modal="${produto.id}"
                        ${quantidade <= 0 ? "disabled" : ""}
                        aria-label="Diminuir quantidade"
                    >−</button>

                    <span class="quantidade-modal">
                        ${quantidade}
                    </span>

                    <button
                        type="button"
                        class="btn-quantidade"
                        data-aumentar-modal="${produto.id}"
                        ${indisponivel || quantidade >= produto.estoque
                            ? "disabled"
                            : ""}
                        aria-label="Aumentar quantidade"
                    >+</button>
                </div>
            </div>
        `;
    }).join("");
}


listaProdutosModal.addEventListener("click", evento => {
    const diminuir = evento.target.closest("[data-diminuir-modal]");
    const aumentar = evento.target.closest("[data-aumentar-modal]");

    if (diminuir) {
        alterarQuantidadeModal(
            Number(diminuir.dataset.diminuirModal),
            -1
        );
    } else if (aumentar) {
        alterarQuantidadeModal(
            Number(aumentar.dataset.aumentarModal),
            1
        );
    }
});

function alterarQuantidadeModal(id, variacao) {
    const produto = produtos.find(item => item.id === id);

    if (!produto) return;

    const atual = selecaoModal[id] || 0;
    const novaQuantidade = atual + variacao;

    if (novaQuantidade < 0) return;

    if (novaQuantidade > produto.estoque) {
        aviso("Quantidade maior que o estoque disponível.");
        return;
    }

    if (novaQuantidade === 0) {
        delete selecaoModal[id];
    } else {
        selecaoModal[id] = novaQuantidade;
    }

    renderizarProdutosModal();
}


concluirSelecaoProdutos.addEventListener("click", () => {
    // Confere o estoque novamente antes de aplicar a seleção.
    for (const [id, quantidade] of Object.entries(selecaoModal)) {
        const produto = produtos.find(item => item.id === Number(id));

        if (!produto || quantidade < 1 || quantidade > produto.estoque) {
            aviso("Confira as quantidades e o estoque dos produtos.");
            renderizarProdutosModal();
            return;
        }
    }

    carrinho = { ...selecaoModal };

    fecharModal();
    renderizarCarrinho();
    atualizarResumoSelecao();
});

function atualizarResumoSelecao() {
    const itens = Object.entries(carrinho);

    if (!itens.length) {
        resumoSelecaoProdutos.innerHTML = `
            <center>
                <p>Nenhum produto selecionado ainda.</p>
            </center>
        `;
        return;
    }

    resumoSelecaoProdutos.innerHTML = `
        <p>
            <strong>${quantidadeTotal()}</strong>
            unidade(s) selecionada(s) ·
            <strong>${dinheiro(calcularTotal())}</strong>
        </p>
    `;
}

// ======================================================
// CARRINHO
// ======================================================

function calcularTotal() {
    return Object.entries(carrinho).reduce((total, [id, quantidade]) => {
        const produto = produtos.find(item => item.id === Number(id));

        return total + (produto ? produto.preco * quantidade : 0);
    }, 0);
}

function quantidadeTotal() {
    return Object.values(carrinho).reduce(
        (soma, quantidade) => soma + quantidade,
        0
    );
}

function renderizarCarrinho() {
    const itens = Object.entries(carrinho).filter(
        ([, quantidade]) => quantidade > 0
    );

    if (!itens.length) {
        carrinhoElemento.innerHTML = `
            <div class="cart-empty">
                Nenhum produto adicionado.
            </div>
        `;
    } else {
        carrinhoElemento.innerHTML = itens.map(([id, quantidade]) => {
            const produto = produtos.find(item => item.id === Number(id));

            if (!produto) return "";

            return `
                <div class="cart-line">
                    <div>
                        <div class="cart-line-name">
                            ${escapar(produto.nome)}
                        </div>

                        <div class="cart-line-meta">
                            ${dinheiro(produto.preco)} cada
                        </div>

                        <div class="qty-control" style="margin-top:9px">
                            <button
                                type="button"
                                data-diminuir="${produto.id}"
                                aria-label="Diminuir quantidade"
                            >−</button>

                            <span class="qty-number">${quantidade}</span>

                            <button
                                type="button"
                                data-aumentar="${produto.id}"
                                aria-label="Aumentar quantidade"
                            >+</button>

                            <button
                                type="button"
                                class="remove-line"
                                data-remover="${produto.id}"
                            >Remover</button>
                        </div>
                    </div>

                    <div style="font-size:12px;font-weight:600">
                        ${dinheiro(produto.preco * quantidade)}
                    </div>
                </div>
            `;
        }).join("");
    }

    totalElemento.textContent = dinheiro(calcularTotal());
    atualizarResumoSelecao();
}


carrinhoElemento.addEventListener("click", evento => {
    const diminuir = evento.target.closest("[data-diminuir]");
    const aumentar = evento.target.closest("[data-aumentar]");
    const remover = evento.target.closest("[data-remover]");

    if (diminuir) {
        alterarQuantidade(
            Number(diminuir.dataset.diminuir),
            -1
        );
    } else if (aumentar) {
        alterarQuantidade(
            Number(aumentar.dataset.aumentar),
            1
        );
    } else if (remover) {
        removerProduto(Number(remover.dataset.remover));
    }
});

function alterarQuantidade(id, variacao) {
    const produto = produtos.find(item => item.id === id);

    if (!produto) return;

    const novaQuantidade = (carrinho[id] || 0) + variacao;

    if (novaQuantidade <= 0) {
        delete carrinho[id];
    } else if (novaQuantidade > produto.estoque) {
        aviso("Quantidade maior que o estoque disponível.");
        return;
    } else {
        carrinho[id] = novaQuantidade;
    }

    renderizarCarrinho();
}

function removerProduto(id) {
    delete carrinho[id];
    renderizarCarrinho();
}

function validarEstoque() {
    for (const [id, quantidade] of Object.entries(carrinho)) {
        const produto = produtos.find(item => item.id === Number(id));

        if (!produto || quantidade <= 0 ||
            quantidade > produto.estoque) {
            aviso("Confira o estoque dos produtos antes de salvar.");
            return false;
        }
    }

    return true;
}

function verificarAberturaCaixa() {
    const caixa = obterCaixaHoje();

    if (!caixa) {
        modalAbertura.hidden = false;
        document.body.style.overflow = "hidden";

        if (btnAbrirVenda) btnAbrirVenda.disabled = true;
        if (btnEntradaManual) btnEntradaManual.disabled = true;
        if (btnRetiradaManual) btnRetiradaManual.disabled = true;

        statusCaixa.innerHTML =
            '<i class="fa-solid fa-circle"></i> Caixa fechado';

        return;
    }

    modalAbertura.hidden = true;
    document.body.style.overflow = "";

    if (btnAbrirVenda) btnAbrirVenda.disabled = false;
    if (btnEntradaManual) btnEntradaManual.disabled = false;
    if (btnRetiradaManual) btnRetiradaManual.disabled = false;

    statusCaixa.innerHTML =
        '<i class="fa-solid fa-circle"></i> Caixa aberto';

    atualizarResumoCaixa();
}

formAbertura.addEventListener("submit", evento => {
    evento.preventDefault();

    if (obterCaixaHoje()) {
        aviso("O caixa de hoje já foi aberto.");
        verificarAberturaCaixa();
        return;
    }

    const valor = Number(valorInicialCaixa.value);

    if (!Number.isFinite(valor) || valor < 0) {
        aviso("Informe um valor inicial válido.");
        return;
    }

    const novoCaixa = {
        id: gerarId(),
        data: dataLocal(),
        dataHoraAbertura: new Date().toISOString(),
        valorAbertura: Math.round(valor * 100) / 100,
        movimentacoes: []
    };

    sessoesCaixa.push(novoCaixa);

    if (!salvarSessoesCaixa()) {
        sessoesCaixa.pop();
        return;
    }

    verificarAberturaCaixa();
    aviso("Caixa aberto com sucesso!");
});

function abrirModalMovimentacao(tipo) {
    const caixa = obterCaixaHoje();

    if (!caixa) {
        aviso("Abra o caixa antes de registrar movimentações.");
        verificarAberturaCaixa();
        return;
    }

    tipoMovimentacaoAtual = tipo;

    $("tituloMovimentacao").textContent =
        tipo === "entrada" ? "Entrada manual" : "Retirada do caixa";

    $("descricaoMovimentacao").textContent =
        tipo === "entrada"
            ? "Registre o dinheiro colocado no caixa."
            : "Registre o dinheiro retirado do caixa.";

    motivoMovimentacao.value = "";
    valorMovimentacao.value = "";
    modalMovimentacao.hidden = false;
    valorMovimentacao.focus();
}

btnEntradaManual.addEventListener("click", () => {
    abrirModalMovimentacao("entrada");
});

btnRetiradaManual.addEventListener("click", () => {
    abrirModalMovimentacao("retirada");
});

cancelarMovimentacao.addEventListener("click", () => {
    modalMovimentacao.hidden = true;
    formMovimentacao.reset();
});

formMovimentacao.addEventListener("submit", evento => {
    evento.preventDefault();

    const caixa = obterCaixaHoje();

    if (!caixa) {
        aviso("Não existe um caixa aberto hoje.");
        verificarAberturaCaixa();
        return;
    }

    const valor = Number(valorMovimentacao.value);
    const descricao = motivoMovimentacao.value.trim();

    if (!Number.isFinite(valor) || valor <= 0) {
        aviso("Informe um valor maior que zero.");
        return;
    }

    if (!descricao) {
        aviso("Informe a descrição da movimentação.");
        motivoMovimentacao.focus();
        return;
    }

    const movimentacao = {
        id: gerarId(),
        tipo: tipoMovimentacaoAtual,
        valor: Math.round(valor * 100) / 100,
        descricao,
        dataHora: new Date().toISOString()
    };

    caixa.movimentacoes.push(movimentacao);

    if (!salvarSessoesCaixa()) {
        caixa.movimentacoes.pop();
        return;
    }

    modalMovimentacao.hidden = true;
    formMovimentacao.reset();

    atualizarResumoCaixa();
    aviso(
        tipoMovimentacaoAtual === "entrada"
            ? "Entrada registrada com sucesso!"
            : "Retirada registrada com sucesso!"
    );
});



function atualizarResumoCaixa() {
    const caixa = obterCaixaHoje();

    // Sem caixa aberto: todos os valores ficam zerados.
    if (!caixa) {
        if (valorAberturaEl) valorAberturaEl.textContent = dinheiro(0);
        if (totalEntradasEl) totalEntradasEl.textContent = dinheiro(0);
        if (totalDinheiroEl) totalDinheiroEl.textContent = dinheiro(0);
        if (totalRetiradasEl) totalRetiradasEl.textContent = dinheiro(0);
        if (saldoCaixaEl) saldoCaixaEl.textContent = dinheiro(0);
        if (statTotalCaixa) statTotalCaixa.textContent = dinheiro(0);

        if (listaMovimentacoes) {
            listaMovimentacoes.innerHTML = `
                <tr>
                    <td colspan="4">
                        Abra o caixa para iniciar as movimentações.
                    </td>
                </tr>
            `;
        }

        return;
    }

    const movimentacoes = caixa.movimentacoes || [];

    // Total das entradas manuais.
    const entradas = movimentacoes
        .filter(item => item.tipo === "entrada")
        .reduce(
            (soma, item) => soma + moedaParaNumero(item.valor),
            0
        );

    // Total das retiradas manuais.
    const retiradas = movimentacoes
        .filter(item => item.tipo === "retirada")
        .reduce(
            (soma, item) => soma + moedaParaNumero(item.valor),
            0
        );

    // Somente vendas pagas em dinheiro entram no caixa físico.
    const vendasDinheiro = vendas
        .filter(venda =>
            venda.data === caixa.data &&
            venda.pagamento === "Dinheiro"
        )
        .reduce(
            (soma, venda) => soma + moedaParaNumero(venda.total),
            0
        );

    const abertura = moedaParaNumero(caixa.valorAbertura);

    // Saldo físico esperado na gaveta.
    const saldo = abertura + entradas + vendasDinheiro - retiradas;

    // Atualiza os cards do resumo.
    if (valorAberturaEl) {
        valorAberturaEl.textContent = dinheiro(abertura);
    }

    if (totalEntradasEl) {
        totalEntradasEl.textContent = dinheiro(entradas);
    }

    if (totalDinheiroEl) {
        totalDinheiroEl.textContent = dinheiro(vendasDinheiro);
    }

    if (totalRetiradasEl) {
        totalRetiradasEl.textContent = dinheiro(retiradas);
    }

    if (saldoCaixaEl) {
        saldoCaixaEl.textContent = dinheiro(saldo);
    }

    // Atualiza o card principal de Total do caixa.
    if (statTotalCaixa) {
        statTotalCaixa.textContent = dinheiro(saldo);
    }

    // Histórico de entradas e retiradas manuais.
    if (!listaMovimentacoes) return;

    if (!movimentacoes.length) {
        listaMovimentacoes.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhuma movimentação manual hoje.
                </td>
            </tr>
        `;
        return;
    }

    listaMovimentacoes.innerHTML = [...movimentacoes]
        .sort((a, b) =>
            new Date(b.dataHora) - new Date(a.dataHora)
        )
        .map(item => {
            const entrada = item.tipo === "entrada";
            const dataHora = new Date(item.dataHora);

            return `
                <tr>
                    <td>
                        ${dataHora.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </td>

                    <td>${entrada ? "Entrada" : "Retirada"}</td>

                    <td>${escapar(item.descricao)}</td>

                    <td class="${entrada ? "valor-entrada" : "valor-retirada"}">
                        ${entrada ? "+" : "−"}${dinheiro(item.valor)}
                    </td>
                </tr>
            `;
        })
        .join("");
}


// ======================================================
// SALVAR VENDA
// ======================================================

formVenda.addEventListener("submit", evento => {
    evento.preventDefault();

    const cliente = clienteInput.value.trim();
    const pagamento = pagamentoInput.value;
    const itens = Object.entries(carrinho);

    if (!obterCaixaHoje()) {
    aviso("Abra o caixa antes de registrar uma venda.");
    verificarAberturaCaixa();
    return;
}

    if (!cliente) {
        aviso("Informe o nome do cliente.");
        clienteInput.focus();
        return;
    }

    if (!formasPagamento.includes(pagamento)) {
        aviso("Selecione uma forma de pagamento válida.");
        pagamentoInput.focus();
        return;
    }

    if (!itens.length) {
        aviso("Adicione pelo menos um produto à venda.");
        return;
    }

    if (!validarEstoque()) {
        return;
    }

    const novaVenda = {
        id: gerarId(),
        data: dataLocal(),
        dataHora: new Date().toISOString(),
        cliente,
        pagamento,
        itens: itens.map(([id, quantidade]) => {
            const produto = produtos.find(
                item => item.id === Number(id)
            );

            return {
                produtoId: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                quantidade
            };
        }),
        total: calcularTotal()
    };

    const vendasAtualizadas = [novaVenda, ...vendas];

    const produtosAtualizados = produtos.map(produto => ({
        ...produto,
        estoque: produto.estoque - (carrinho[produto.id] || 0)
    }));

    // Persiste os dados antes de atualizar a interface.
    if (!salvarDados(CHAVE_VENDAS, vendasAtualizadas)) return;

    if (!salvarDados(CHAVE_PRODUTOS, produtosAtualizados)) {
        salvarDados(CHAVE_VENDAS, vendas);
        return;
    }

    vendas = vendasAtualizadas;
    produtos = produtosAtualizados;

    carrinho = {};
    selecaoModal = {};

    formVenda.reset();

    renderizarCarrinho();
    atualizarResumoCaixa();
    renderizarProdutosModal();
    renderizarVendas();
    atualizarCatalogo();

    formularioVenda.hidden = true;

    aviso("Venda salva com sucesso!");
});

// ======================================================
// HISTÓRICO E FILTRO POR DATA
// ======================================================

$("btnFiltrar").addEventListener("click", () => {
    const inicio = dataInicialInput.value;
    const fim = dataFinalInput.value;

    if (inicio && fim && inicio > fim) {
        aviso("A data inicial não pode ser posterior à final.");
        return;
    }

    renderizarVendas();
});

$("btnLimparFiltro").addEventListener("click", () => {
    dataInicialInput.value = "";
    dataFinalInput.value = "";
    renderizarVendas();
});

function obterVendasFiltradas() {
    const inicio = dataInicialInput.value;
    const fim = dataFinalInput.value;

    return vendas.filter(venda => {
        if (inicio && venda.data < inicio) return false;
        if (fim && venda.data > fim) return false;

        return true;
    });
}

function renderizarVendas() {
    const vendasFiltradas = obterVendasFiltradas();

    statVendas.textContent = vendasFiltradas.length;

    const totalPeriodo = vendasFiltradas.reduce(
        (soma, venda) => soma + Number(venda.total || 0),
        0
    );

    statTotal.textContent = dinheiro(totalPeriodo);

    if (!vendasFiltradas.length) {
        listaVendas.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    Nenhuma venda encontrada neste período.
                </td>
            </tr>
        `;
        return;
    }

    listaVendas.innerHTML = vendasFiltradas.map(venda => {
        const resumoProdutos = venda.itens.map(item =>
            `${item.quantidade}x ${escapar(item.nome)}`
        ).join(", ");

        return `
            <tr>
                <td>${formatarData(venda.data)}</td>

                <td>
                    <div class="product-name">
                        ${escapar(venda.cliente)}
                    </div>
                </td>

                <td>${resumoProdutos}</td>

                <td>${escapar(venda.pagamento)}</td>

                <td class="price">${dinheiro(venda.total)}</td>

                <td>
                    <div class="actions">
                        <button
                            type="button"
                            class="icon-btn"
                            data-excluir="${escapar(venda.id)}"
                            title="Excluir venda"
                            aria-label="Excluir venda"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// ======================================================
// EXCLUIR VENDA E DEVOLVER ESTOQUE
// ======================================================

listaVendas.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-excluir]");

    if (botao) {
        excluirVenda(botao.dataset.excluir);
    }
});

function excluirVenda(id) {
    const venda = vendas.find(
        item => String(item.id) === String(id)
    );

    if (!venda) return;

    const confirmado = window.confirm(
        `Deseja excluir a venda de ${venda.cliente}, no valor de ` +
        `${dinheiro(venda.total)}?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmado) return;

    const produtosAtualizados = produtos.map(produto => {
        const quantidadeVendida = venda.itens
            .filter(item => item.produtoId === produto.id)
            .reduce((soma, item) => soma + Number(item.quantidade), 0);

        return {
            ...produto,
            estoque: produto.estoque + quantidadeVendida
        };
    });

    const vendasAtualizadas = vendas.filter(
        item => String(item.id) !== String(id)
    );

    if (!salvarDados(CHAVE_PRODUTOS, produtosAtualizados)) return;

    if (!salvarDados(CHAVE_VENDAS, vendasAtualizadas)) {
        salvarDados(CHAVE_PRODUTOS, produtos);
        return;
    }

    produtos = produtosAtualizados;
    vendas = vendasAtualizadas;

    renderizarProdutosModal();
    renderizarVendas();
    atualizarCatalogo();

    aviso("Venda excluída e estoque devolvido.");
}

// ======================================================
// NOTIFICAÇÕES
// ======================================================

function aviso(mensagem) {
    const elemento = $("toast");

    elemento.textContent = mensagem;
    elemento.classList.add("show");

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        elemento.classList.remove("show");
    }, 3000);
}


function atualizarCatalogo() {
    statCatalogo.textContent = produtos.filter(
        produto => Number(produto.estoque) > 0
    ).length;
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

renderizarCarrinho();
atualizarResumoSelecao();
atualizarCatalogo();
renderizarVendas();
verificarAberturaCaixa();
atualizarResumoCaixa();