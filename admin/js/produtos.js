
/* =========================================
   CONFIGURAÇÃO DA API
========================================= */

const API_PRODUTOS = 'api/produtos.php';

let produtos = [];
let editando = null;
let adicionando = false;
let carregando = false;

const dinheiro = valor =>
    Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

/* =========================================
   MENU RESPONSIVO
========================================= */

const shopToggle = document.getElementById('menuToggle');
const shopOverlay = document.getElementById('menuOverlay');

shopToggle?.addEventListener('click', () => {
    document.body.classList.toggle('menu-aberto');
});

shopOverlay?.addEventListener('click', () => {
    document.body.classList.remove('menu-aberto');
});

/* =========================================
   COMUNICAÇÃO COM A API
========================================= */

async function requisicaoProdutos(metodo = 'GET', dados = null) {
    const opcoes = {
        method: metodo,
        headers: {
            'Accept': 'application/json'
        }
    };

    if (dados !== null) {
        opcoes.headers['Content-Type'] = 'application/json';
        opcoes.body = JSON.stringify(dados);
    }

    const resposta = await fetch(API_PRODUTOS, opcoes);

    const texto = await resposta.text();

    let resultado;

    try {
        resultado = JSON.parse(texto);
    } catch {
        throw new Error(
            'A API não retornou JSON válido. Verifique o endereço e os erros do PHP.'
        );
    }

    if (!resposta.ok || resultado.sucesso === false || resultado.erro) {
        throw new Error(
            resultado.erro || 'Não foi possível concluir a operação.'
        );
    }

    return resultado;
}

/* =========================================
   CARREGAR PRODUTOS DO GOOGLE SHEETS
========================================= */

async function carregarProdutos() {
    carregando = true;
    renderizar();

    try {
        const resultado = await requisicaoProdutos('GET');

        produtos = (resultado.produtos || []).map(item => ({
            id: String(item.id),
            nome: String(item.produto || ''),
            preco: Number(item.preco) || 0,
            estoque: Number(item.estoque) || 0,
            emoji: '🧴'
        }));

        produtos.sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
        );

    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        alert('Não foi possível carregar os produtos: ' + erro.message);

    } finally {
        carregando = false;
        renderizar();
    }
}

/* =========================================
   STATUS DO ESTOQUE
========================================= */

function status(produto) {
    if (produto.estoque === 0) {
        return ['Sem estoque', 'pill-red'];
    }

    if (produto.estoque <= 3) {
        return ['Estoque baixo', 'pill-yellow'];
    }

    return ['Em estoque', 'pill-green'];
}

/* =========================================
   PROTEÇÃO DE TEXTO
========================================= */

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

/* =========================================
   RENDERIZAÇÃO DA TABELA
========================================= */

function renderizar() {
    const busca = document.getElementById('busca').value
        .trim()
        .toLowerCase();

    const filtro = document.getElementById('filtro').value;
    const tabela = document.getElementById('tabela');

    if (carregando) {
        tabela.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Carregando produtos...
                </td>
            </tr>
        `;

        atualizarIndicadores();
        return;
    }

    const lista = produtos.filter(produto => {
        const correspondeBusca = produto.nome
            .toLowerCase()
            .includes(busca);

        const correspondeFiltro =
            filtro === 'todos' ||
            (filtro === 'normal' && produto.estoque > 3) ||
            (filtro === 'baixo' &&
                produto.estoque > 0 &&
                produto.estoque <= 3) ||
            (filtro === 'zero' && produto.estoque === 0);

        return correspondeBusca && correspondeFiltro;
    });

    const linhaNovoProduto = adicionando ? `
        <tr class="linha-novo-produto">
            <td>
                <input
                    class="shop-field campo-edicao"
                    id="novo-nome"
                    maxlength="100"
                    placeholder="Descrição do produto"
                    aria-label="Descrição do produto">
            </td>

            <td class="price">
                <input
                    class="shop-field campo-edicao"
                    id="novo-preco"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    aria-label="Preço de venda">
            </td>

            <td>
                <input
                    class="shop-field campo-edicao campo-estoque"
                    id="novo-estoque"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    aria-label="Quantidade em estoque">
            </td>

            <td>
                <span class="pill">Novo produto</span>
            </td>

            <td>
                <div class="actions">
                    <button
                        type="button"
                        class="icon-btn"
                        title="Salvar produto"
                        aria-label="Salvar produto"
                        onclick="salvarNovoProduto()">
                        <i class="fa-solid fa-check"></i>
                    </button>

                    <button
                        type="button"
                        class="icon-btn"
                        title="Cancelar cadastro"
                        aria-label="Cancelar cadastro"
                        onclick="cancelarNovoProduto()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </td>
        </tr>
    ` : '';

    const linhasProdutos = lista.map(produto => {
        const situacao = status(produto);
        const estaEditando = editando === produto.id;
        const idSeguro = escapar(produto.id);

        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="product-thumb">
                            ${produto.emoji}
                        </div>

                        <div>
                            ${
                                estaEditando
                                ? `
                                    <input
                                        class="shop-field campo-edicao"
                                        id="nome-${idSeguro}"
                                        maxlength="100"
                                        value="${escapar(produto.nome)}"
                                        aria-label="Descrição do produto">
                                `
                                : `
                                    <div class="product-name">
                                        ${escapar(produto.nome)}
                                    </div>
                                `
                            }

                            <div class="product-code">
                                Código #${idSeguro}
                            </div>
                        </div>
                    </div>
                </td>

                <td class="price">
                    ${
                        estaEditando
                        ? `
                            <input
                                class="shop-field campo-edicao"
                                id="preco-${idSeguro}"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value="${produto.preco}"
                                aria-label="Preço de venda">
                        `
                        : dinheiro(produto.preco)
                    }
                </td>

                <td>
                    ${
                        estaEditando
                        ? `
                            <input
                                class="shop-field campo-edicao campo-estoque"
                                id="estoque-${idSeguro}"
                                type="number"
                                min="0"
                                step="1"
                                value="${produto.estoque}"
                                aria-label="Quantidade em estoque">
                        `
                        : `${produto.estoque} un.`
                    }
                </td>

                <td>
                    <span class="pill ${situacao[1]}">
                        ${situacao[0]}
                    </span>
                </td>

                <td>
                    <div class="actions">
                        ${
                            estaEditando
                            ? `
                                <button
                                    type="button"
                                    class="icon-btn"
                                    title="Salvar alterações"
                                    aria-label="Salvar alterações"
                                    onclick="salvarEdicao('${idSeguro}')">
                                    <i class="fa-solid fa-check"></i>
                                </button>

                                <button
                                    type="button"
                                    class="icon-btn"
                                    title="Cancelar edição"
                                    aria-label="Cancelar edição"
                                    onclick="cancelarEdicao()">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            `
                            : `
                                <button
                                    type="button"
                                    class="icon-btn"
                                    title="Editar"
                                    aria-label="Editar produto"
                                    onclick="editar('${idSeguro}')">
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    class="icon-btn"
                                    title="Excluir"
                                    aria-label="Excluir produto"
                                    onclick="excluir('${idSeguro}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            `
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (lista.length === 0 && !adicionando) {
        tabela.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Nenhum produto encontrado.
                </td>
            </tr>
        `;
    } else {
        tabela.innerHTML = linhaNovoProduto + linhasProdutos;
    }

    atualizarIndicadores();
}

/* =========================================
   INDICADORES DO ESTOQUE
========================================= */

function atualizarIndicadores() {
    document.getElementById('statProdutos').textContent =
        produtos.length;

    document.getElementById('statUnidades').textContent =
        produtos.reduce(
            (total, produto) => total + produto.estoque,
            0
        );

    document.getElementById('statBaixo').textContent =
        produtos.filter(produto => produto.estoque <= 3).length;
}

/* =========================================
   VALIDAR CAMPOS
========================================= */

function obterDadosFormulario(prefixo) {
    const nome = document.getElementById(`${prefixo}nome`).value.trim();
    const precoTexto = document.getElementById(`${prefixo}preco`).value;
    const estoqueTexto = document.getElementById(`${prefixo}estoque`).value;

    const preco = Number(precoTexto);
    const estoque = Number(estoqueTexto);

    if (
        !nome ||
        precoTexto.trim() === '' ||
        !Number.isFinite(preco) ||
        preco <= 0 ||
        estoqueTexto.trim() === '' ||
        !Number.isInteger(estoque) ||
        estoque < 0
    ) {
        throw new Error(
            'Informe a descrição, um preço maior que zero e uma quantidade inteira igual ou maior que zero.'
        );
    }

    return {
        produto: nome,
        preco,
        estoque
    };
}

/* =========================================
   EDITAR PRODUTO
========================================= */

function editar(id) {
    if (editando !== null || adicionando) {
        alert('Salve ou cancele a operação atual primeiro.');
        return;
    }

    const produto = produtos.find(item => item.id === String(id));

    if (!produto) return;

    editando = produto.id;
    renderizar();

    document.getElementById(`nome-${produto.id}`).focus();
}

/* =========================================
   SALVAR EDIÇÃO NA PLANILHA
========================================= */

async function salvarEdicao(id) {
    const produto = produtos.find(item => item.id === String(id));

    if (!produto) return;

    try {
        const dados = obterDadosFormulario('');

        await requisicaoProdutos('PUT', {
            id: produto.id,
            ...dados
        });

        produto.nome = dados.produto;
        produto.preco = dados.preco;
        produto.estoque = dados.estoque;

        editando = null;

        renderizar();
        aviso('Produto atualizado na planilha!');

    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);
        alert(erro.message);
    }
}

/* =========================================
   CANCELAR EDIÇÃO
========================================= */

function cancelarEdicao() {
    editando = null;
    renderizar();
}

/* =========================================
   EXCLUIR PRODUTO DA PLANILHA
========================================= */

async function excluir(id) {
    const produto = produtos.find(item => item.id === String(id));

    if (!produto) return;

    const confirmou = confirm(
        `Deseja excluir "${produto.nome}"?`
    );

    if (!confirmou) return;

    try {
        await requisicaoProdutos('DELETE', {
            id: produto.id
        });

        produtos = produtos.filter(
            item => item.id !== produto.id
        );

        renderizar();
        aviso('Produto removido do catálogo!');

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
        alert(erro.message);
    }
}

/* =========================================
   NOVO PRODUTO
========================================= */

function novoProduto() {
    if (editando !== null || adicionando) {
        alert('Salve ou cancele a operação atual primeiro.');
        return;
    }

    adicionando = true;

    document.getElementById('busca').value = '';
    document.getElementById('filtro').value = 'todos';

    renderizar();

    document.getElementById('novo-nome').focus();
}

/* =========================================
   SALVAR NOVO PRODUTO NA PLANILHA
========================================= */

async function salvarNovoProduto() {
    try {
        const dados = obterDadosFormulario('novo-');

        const resultado = await requisicaoProdutos('POST', dados);
        const item = resultado.produto;

        if (!item || item.id === undefined || item.id === null) {
            throw new Error(
                'O produto pode ter sido cadastrado, mas a API não retornou seu ID. Atualize a lista antes de tentar novamente.'
            );
        }

        produtos.push({
            id: String(item.id),
            nome: String(item.produto),
            preco: Number(item.preco),
            estoque: Number(item.estoque),
            emoji: '🧴'
        });

        adicionando = false;

        renderizar();
        aviso('Produto cadastrado no Google Sheets!');

    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro);
        alert(erro.message);
    }
}

/* =========================================
   CANCELAR NOVO CADASTRO
========================================= */

function cancelarNovoProduto() {
    adicionando = false;
    renderizar();
}

/* =========================================
   NOTIFICAÇÕES
========================================= */

let temporizadorAviso;

function aviso(texto) {
    const elemento = document.getElementById('toast');

    if (!elemento) {
        alert(texto);
        return;
    }

    elemento.textContent = texto;
    elemento.classList.add('show');

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        elemento.classList.remove('show');
    }, 2800);
}

/* =========================================
   BUSCA E FILTROS
========================================= */

document.getElementById('busca')
    .addEventListener('input', renderizar);

document.getElementById('filtro')
    .addEventListener('change', renderizar);

/* =========================================
   INICIALIZAÇÃO
========================================= */

carregarProdutos();
