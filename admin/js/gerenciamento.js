const API_URL = "/admin/api/gerenciamento.php";

let procedimentos = [];

const form = document.getElementById("formProcedimento");
const campoId = document.getElementById("procedimentoId");
const campoNome = document.getElementById("nome");
const campoCategoria = document.getElementById("categoria");
const campoPreco = document.getElementById("preco");
const campoDuracao = document.getElementById("duracao");
const campoAtivo = document.getElementById("ativo");

const lista = document.getElementById("listaProcedimentos");
const listaVazia = document.getElementById("listaVazia");
const mensagemCarregamento = document.getElementById("mensagemCarregamento");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");

const dinheiro = valor =>
    Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
            ...opcoes.headers
        }
    });

    const dados = await resposta.json();

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(dados.mensagem || "Não foi possível concluir a operação.");
    }

    return dados;
}

async function carregarProcedimentos() {
    mensagemCarregamento.hidden = false;
    mensagemCarregamento.textContent = "Carregando procedimentos...";
    lista.innerHTML = "";
    listaVazia.hidden = true;

    try {
        const dados = await requisicao(API_URL);

       procedimentos = Array.isArray(dados.procedimentos)
    ? dados.procedimentos.map(p => ({
        id: p.id,
        nome: p.procedimento ?? "",
        categoria: p.servico ?? "",
        preco: Number(p.valor ?? 0),
        duracao: Number(p.duracao ?? 0),
        ativo: p.ativo === true ||
               String(p.ativo).toLowerCase() === "true"
    }))
    : [];

        atualizarResumo();
        atualizarCategorias();
        renderizarProcedimentos();
    } catch (erro) {
        mensagemCarregamento.textContent =
            "Não foi possível carregar os procedimentos.";

        await Swal.fire({
            icon: "error",
            title: "Erro ao carregar",
            text: erro.message
        });
    } finally {
        mensagemCarregamento.hidden = true;
    }
}

function atualizarResumo() {
    document.getElementById("totalProcedimentos").textContent =
        procedimentos.length;

    const categorias = new Set(
    procedimentos
        .map(p => p.categoria.trim().toLowerCase())
        .filter(Boolean)
);

    document.getElementById("totalCategorias").textContent =
        categorias.size;
}

function atualizarCategorias() {
    const filtro = document.getElementById("filtroCategoria");
    const datalist = document.getElementById("categoriasExistentes");
    const selecionada = filtro.value;

    const categorias = [...new Set(
        procedimentos.map(p => p.categoria.trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    filtro.replaceChildren(new Option("Todas as categorias", ""));

    categorias.forEach(categoria => {
        filtro.add(new Option(categoria, categoria));
    });

    filtro.value = categorias.includes(selecionada) ? selecionada : "";

    datalist.replaceChildren();

    categorias.forEach(categoria => {
        datalist.appendChild(new Option(categoria, categoria));
    });
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;

    return elemento;
}

function renderizarProcedimentos() {
    const pesquisa = document.getElementById("pesquisa")
        .value.trim().toLocaleLowerCase("pt-BR");

    const categoria = document.getElementById("filtroCategoria").value;

    const filtrados = procedimentos.filter(p => {
        const correspondeNome = p.nome
            .toLocaleLowerCase("pt-BR")
            .includes(pesquisa);

        const correspondeCategoria =
            !categoria || p.categoria === categoria;

        return correspondeNome && correspondeCategoria;
    });

    lista.replaceChildren();

    document.getElementById("contadorLista").textContent =
        `${filtrados.length} ${filtrados.length === 1 ? "serviço" : "serviços"}`;

    listaVazia.hidden = filtrados.length !== 0;

    filtrados.forEach(p => {
        const card = criarElemento("article", "procedimento-card");

        const topo = criarElemento("div", "procedimento-topo");
        const identificacao = criarElemento("div");
        const icone = criarElemento("div", "procedimento-icone");

        icone.innerHTML = '<i class="fa-solid fa-spa"></i>';

        identificacao.append(
            criarElemento("h3", "", p.nome),
            criarElemento("span", "categoria-tag", p.categoria)
        );

        topo.append(icone, identificacao);

        const dados = criarElemento("div", "procedimento-dados");

        const preco = criarElemento("div");
        preco.append(
            criarElemento("span", "dado-label", "Preço"),
            criarElemento("strong", "dado-valor", dinheiro(p.preco))
        );

        const duracao = criarElemento("div");
        duracao.append(
            criarElemento("span", "dado-label", "Duração"),
            criarElemento("strong", "dado-valor", `${p.duracao} min`)
        );

        dados.append(preco, duracao);

        const acoes = criarElemento("div", "procedimento-acoes");

        const editar = criarElemento("button", "btn-acao");
        editar.type = "button";
        editar.innerHTML = '<i class="fa-solid fa-pen"></i> Editar';
        editar.addEventListener("click", () => editarProcedimento(p.id));

        const excluir = criarElemento("button", "btn-acao excluir");
        excluir.type = "button";
        excluir.innerHTML = '<i class="fa-solid fa-trash"></i> Excluir';
        excluir.addEventListener("click", () => excluirProcedimento(p.id));

        acoes.append(editar, excluir);
        card.append(topo, dados, acoes);
        lista.appendChild(card);
    });
}

form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = campoId.value;

    const procedimento = {
        nome: campoNome.value.trim(),
        categoria: campoCategoria.value.trim(),
        preco: Number(campoPreco.value),
        duracao: Number(campoDuracao.value)
    };

    if (
        !procedimento.nome ||
        !procedimento.categoria ||
        campoPreco.value === "" ||
        campoDuracao.value === "" ||
        !Number.isFinite(procedimento.preco) ||
        procedimento.preco < 0 ||
        !Number.isInteger(procedimento.duracao) ||
        procedimento.duracao < 1
    ) {
        await Swal.fire({
            icon: "warning",
            title: "Confira os campos",
            text: "Informe nome, categoria, preço válido e duração em minutos."
        });
        return;
    }

    btnSalvar.disabled = true;

    try {
        const resultado = await requisicao(API_URL, {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(id ? { id: Number(id), ...procedimento } : procedimento)
        });

        await carregarProcedimentos();
        limparFormulario();
        campoAtivo.value = "true";

        await Swal.fire({
            icon: "success",
            title: "Tudo certo!",
            text: resultado.mensagem || "Procedimento salvo com sucesso.",
            timer: 1800,
            showConfirmButton: false
        });
    } catch (erro) {
        await Swal.fire({
            icon: "error",
            title: "Não foi possível salvar",
            text: erro.message
        });
    } finally {
        btnSalvar.disabled = false;
    }
});

function editarProcedimento(id) {
    const p = procedimentos.find(item => String(item.id) === String(id));

    if (!p) return;

    campoId.value = p.id;
    campoNome.value = p.nome;
    campoCategoria.value = p.categoria;
    campoPreco.value = Number(p.preco).toFixed(2);
    campoDuracao.value = p.duracao;

    document.getElementById("tituloFormulario").textContent =
        "Editar procedimento";

    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';
    btnCancelar.hidden = false;

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    campoNome.focus();
}

function limparFormulario() {
    form.reset();
    campoId.value = "";

    document.getElementById("tituloFormulario").textContent =
        "Novo procedimento";

    btnSalvar.innerHTML =
        '<i class="fa-solid fa-plus"></i> Salvar procedimento';

    btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", limparFormulario);

async function excluirProcedimento(id) {
    const p = procedimentos.find(item => String(item.id) === String(id));

    if (!p) return;

    const confirmacao = await Swal.fire({
        icon: "warning",
        title: "Excluir procedimento?",
        text: `Deseja excluir "${p.nome}" do catálogo?`,
        showCancelButton: true,
        confirmButtonText: "Sim, excluir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#C25A5A"
    });

    if (!confirmacao.isConfirmed) return;

    try {
        const resultado = await requisicao(API_URL, {
            method: "DELETE",
            body: JSON.stringify({ id: Number(id) })
        });

        if (String(campoId.value) === String(id)) {
            limparFormulario();
        }

        await carregarProcedimentos();

        await Swal.fire({
            icon: "success",
            title: "Procedimento excluído",
            text: resultado.mensagem || "O procedimento foi removido.",
            timer: 1600,
            showConfirmButton: false
        });
    } catch (erro) {
        await Swal.fire({
            icon: "error",
            title: "Erro ao excluir",
            text: erro.message
        });
    }
}

document.getElementById("pesquisa")
    .addEventListener("input", renderizarProcedimentos);

document.getElementById("filtroCategoria")
    .addEventListener("change", renderizarProcedimentos);

carregarProcedimentos();
