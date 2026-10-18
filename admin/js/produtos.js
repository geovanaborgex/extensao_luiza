    /* =========================================
       MENU RESPONSIVO
    ========================================= */

    const shopToggle = document.getElementById('menuToggle');
    const shopOverlay = document.getElementById('menuOverlay');

    shopToggle.addEventListener('click', () => {
        document.body.classList.toggle('menu-aberto');
    });

    shopOverlay.addEventListener('click', () => {
        document.body.classList.remove('menu-aberto');
    });


    /* =========================================
       PRODUTOS
    ========================================= */

    let produtos = [
        {
            id: 1,
            nome: 'Shampoo Hidratante',
            preco: 45,
            estoque: 12,
            emoji: '🧴'
        },
        {
            id: 2,
            nome: 'Máscara Capilar',
            preco: 62.90,
            estoque: 3,
            emoji: '🫙'
        },
        {
            id: 3,
            nome: 'Óleo Finalizador',
            preco: 39.90,
            estoque: 8,
            emoji: '✨'
        },
        {
            id: 4,
            nome: 'Leave-in Protetor',
            preco: 54,
            estoque: 0,
            emoji: '🌿'
        }
    ];

    let proximoId = 5;
    let editando = null;
    let adicionando = false;

    const dinheiro = valor =>
        Number(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });


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

    const tabela = document.getElementById('tabela');

    // Linha para cadastrar um novo produto
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
                    placeholder="0,00"
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

    // Renderiza os produtos existentes
    const linhasProdutos = lista.map(produto => {
        const situacao = status(produto);
        const estaEditando = editando === produto.id;

        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <div class="product-thumb">
                            ${produto.emoji || '🧴'}
                        </div>

                        <div>
                            ${
                                estaEditando
                                ? `
                                    <input
                                        class="shop-field campo-edicao"
                                        id="nome-${produto.id}"
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
                                Código #${String(produto.id).padStart(3, '0')}
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
                                id="preco-${produto.id}"
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
                                id="estoque-${produto.id}"
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
                                    onclick="salvarEdicao(${produto.id})">
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
                                    onclick="editar(${produto.id})">
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    type="button"
                                    class="icon-btn"
                                    title="Excluir"
                                    aria-label="Excluir produto"
                                    onclick="excluir(${produto.id})">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            `
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Mostra a linha de cadastro antes dos produtos existentes
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
            produtos.reduce((total, produto) => total + produto.estoque, 0);

        document.getElementById('statBaixo').textContent =
            produtos.filter(produto => produto.estoque <= 3).length;
    }


    /* =========================================
       EDITAR PRODUTO NA PRÓPRIA LINHA
    ========================================= */

    function editar(id) {
    if (editando !== null || adicionando) {
        alert('Salve ou cancele a operação atual primeiro.');
        return;
    }

    const produto = produtos.find(item => item.id === id);

    if (!produto) return;

    editando = id;
    renderizar();

    document.getElementById(`nome-${id}`).focus();
}

    /* =========================================
       SALVAR EDIÇÃO
    ========================================= */

    function salvarEdicao(id) {
        const nome = document.getElementById(`nome-${id}`).value.trim();
        const precoTexto = document.getElementById(`preco-${id}`).value;
        const estoqueTexto = document.getElementById(`estoque-${id}`).value;

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
            alert(
                'Informe uma descrição, um preço maior que zero e uma quantidade inteira igual ou maior que zero.'
            );
            return;
        }

        const produto = produtos.find(item => item.id === id);

        if (!produto) return;

        produto.nome = nome;
        produto.preco = preco;
        produto.estoque = estoque;

        editando = null;

        renderizar();
        aviso('Produto atualizado!');
    }


    /* =========================================
       CANCELAR EDIÇÃO
    ========================================= */

    function cancelarEdicao() {
        editando = null;
        renderizar();
    }

    /* =========================================
       EXCLUIR PRODUTO
    ========================================= */

    function excluir(id) {
        const produto = produtos.find(item => item.id === id);

        if (!produto) return;

        const confirmou = confirm(
            `Deseja excluir "${produto.nome}"?`
        );

        if (!confirmou) return;

        produtos = produtos.filter(item => item.id !== id);

        renderizar();
        aviso('Produto removido do catálogo!');
    }


/* =========================================
   ADICIONAR PRODUTO NA TABELA
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
    SALVAR NOVO PRODUTO
    ========================================= */

    function salvarNovoProduto() {
        const nome = document.getElementById('novo-nome').value.trim();
        const precoTexto = document.getElementById('novo-preco').value;
        const estoqueTexto = document.getElementById('novo-estoque').value;

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
            alert('Preencha a descrição, um preço maior que zero e uma quantidade inteira igual ou maior que zero.');
            return;
        }

        produtos.push({
            id: proximoId++,
            nome: nome,
            preco: preco,
            estoque: estoque,
            emoji: '🧴'
        });

        adicionando = false;

        renderizar();
        aviso('Produto adicionado ao catálogo!');
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

    document.getElementById('busca').addEventListener('input', renderizar);
    document.getElementById('filtro').addEventListener('change', renderizar);


    /* =========================================
       INICIALIZAÇÃO
    ========================================= */

    renderizar();
