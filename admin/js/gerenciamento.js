
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

function ativoBooleano(valor) {
    return valor === true ||
        String(valor).trim().toLowerCase() === "true" ||
        String(valor).trim() === "1";
}

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    const texto = await resposta.text();

    console.log("Status HTTP:", resposta.status);
    console.log("Resposta bruta do servidor:", texto);

    let dados;

    try {
        dados = JSON.parse(texto);
    } catch (erro) {
        console.error("O servidor não retornou JSON válido:", erro);
        throw new Error(
            "Resposta inválida do servidor. Confira o Console (F12)."
        );
    }

    if (!resposta.ok || dados.sucesso === false) {
        throw new Error(
            dados.mensagem || `Erro HTTP ${resposta.status}`
        );
    }

    return dados;
}

async function carregarProcedimentos() {
    mensagemCarregamento.hidden = false;
    mensagemCarregamento.textContent = "Carregando procedimentos...";
    lista.replaceChildren();
    listaVazia.hidden = true;

    try {
        const dados = await requisicao(API_URL);

        procedimentos = Array.isArray(dados.procedimentos)
            ? dados.procedimentos.map(p => ({
                id: p.id,
                nome: String(p.procedimento ?? p.nome ?? ""),
                categoria: String(p.servico ?? p.categoria ?? ""),
                preco: Number(p.valor ?? p.preco ?? 0),
                duracao: Number(p.duracao ?? 0),
                ativo: ativoBooleano(p.ativo)
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

    const categorias = [
        ...new Set(
            procedimentos
                .map(p => p.categoria.trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    filtro.replaceChildren(
        new Option("Todos os serviços", "")
    );

    categorias.forEach(servico => {
        filtro.add(new Option(servico, servico));
    });

    filtro.value = categorias.includes(selecionada)
        ? selecionada
        : "";

    datalist.replaceChildren();

    categorias.forEach(servico => {
        datalist.appendChild(new Option(servico, servico));
    });
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}


function renderizarProcedimentos() {
    const pesquisa = document.getElementById("pesquisa")
        .value.trim().toLocaleLowerCase("pt-BR");

    const categoria = document.getElementById("filtroCategoria").value;

    const filtrados = procedimentos.filter(p => {
        const correspondeNome =
            p.nome.toLocaleLowerCase("pt-BR").includes(pesquisa);

        const correspondeCategoria =
            !categoria || p.categoria === categoria;

        return correspondeNome && correspondeCategoria;
    });

    lista.replaceChildren();

    document.getElementById("contadorLista").textContent =
        `${filtrados.length} ${
            filtrados.length === 1 ? "serviço" : "serviços"
        }`;

    listaVazia.hidden = filtrados.length !== 0;

    // Agrupa os procedimentos por categoria
    const grupos = new Map();

    filtrados.forEach(p => {
        const nomeCategoria = p.categoria.trim() || "Sem categoria";

        if (!grupos.has(nomeCategoria)) {
            grupos.set(nomeCategoria, []);
        }

        grupos.get(nomeCategoria).push(p);
    });

    [...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
        .forEach(([nomeCategoria, itens]) => {
            const grupo = criarElemento("div", "categoria-grupo");

            const titulo = criarElemento("div", "categoria-titulo");
            titulo.append(
                criarElemento("span", "", nomeCategoria),
                criarElemento(
                    "span",
                    "categoria-total",
                    `${itens.length} ${itens.length === 1 ? "procedimento" : "procedimentos"}`
                )
            );

            grupo.appendChild(titulo);

            itens.forEach(p => {
                const card = criarElemento(
                    "article",
                    `procedimento-card${p.ativo ? "" : " inativo"}`
                );

                const identificacao = criarElemento(
                    "div",
                    "procedimento-identificacao"
                );

                identificacao.appendChild(
                    criarElemento("h3", "", p.nome)
                );

                const dados = criarElemento("div", "procedimento-dados");

                const preco = criarElemento("div");
                preco.append(
                    criarElemento("span", "dado-label", "Valor"),
                    criarElemento("strong", "dado-valor", dinheiro(p.preco))
                );

                const duracao = criarElemento("div");
                duracao.append(
                    criarElemento("span", "dado-label", "Duração"),
                    criarElemento("strong", "dado-valor", `${p.duracao} min`)
                );

                dados.append(preco, duracao);

                const status = criarElemento(
                    "span",
                    p.ativo ? "status-ativo" : "status-inativo",
                    p.ativo ? "Ativo" : "Inativo"
                );

                const acoes = criarElemento("div", "procedimento-acoes");

                const editar = criarElemento("button", "btn-acao");
                editar.type = "button";
                editar.title = "Editar procedimento";
                editar.setAttribute("aria-label", `Editar ${p.nome}`);
                editar.innerHTML = '<i class="fa-solid fa-pen"></i>';
                editar.addEventListener("click", () => {
                    editarProcedimento(p.id);
                });

                const alternarStatus = criarElemento(
                    "button",
                    p.ativo ? "btn-acao excluir" : "btn-acao"
                );

                alternarStatus.type = "button";
                alternarStatus.title = p.ativo
                    ? "Inativar procedimento"
                    : "Ativar procedimento";

                alternarStatus.setAttribute(
                    "aria-label",
                    `${p.ativo ? "Inativar" : "Ativar"} ${p.nome}`
                );

                alternarStatus.innerHTML = p.ativo
                    ? '<i class="fa-solid fa-trash"></i>'
                    : '<i class="fa-solid fa-rotate-left"></i>';

                alternarStatus.addEventListener("click", () => {
                    alterarStatusProcedimento(p.id);
                });

                acoes.append(editar, alternarStatus);
                card.append(identificacao, dados, status, acoes);
                grupo.appendChild(card);
            });

            lista.appendChild(grupo);
        });
}


form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = campoId.value;

    const procedimento = {
        nome: campoNome.value.trim(),
        categoria: campoCategoria.value.trim(),
        preco: Number(campoPreco.value),
        duracao: Number(campoDuracao.value),
        ativo: campoAtivo.value === "true"
    };

    if (
        !procedimento.nome ||
        !procedimento.categoria ||
        campoPreco.value.trim() === "" ||
        campoDuracao.value.trim() === "" ||
        !Number.isFinite(procedimento.preco) ||
        procedimento.preco <= 0 ||
        !Number.isInteger(procedimento.duracao) ||
        procedimento.duracao < 1 ||
        !["true", "false"].includes(campoAtivo.value)
    ) {
        await Swal.fire({
            icon: "warning",
            title: "Confira os campos",
            text:
                "Informe o serviço, o nome do procedimento, " +
                "um valor maior que zero e uma duração válida."
        });

        return;
    }

    btnSalvar.disabled = true;

    try {
        const resultado = await requisicao(API_URL, {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(
                id
                    ? { id: Number(id), ...procedimento }
                    : procedimento
            )
        });

        await carregarProcedimentos();
        limparFormulario();

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
    const p = procedimentos.find(
        item => String(item.id) === String(id)
    );

    if (!p) return;

    campoId.value = p.id;
    campoNome.value = p.nome;
    campoCategoria.value = p.categoria;
    campoPreco.value = Number(p.preco).toFixed(2);
    campoDuracao.value = p.duracao;
    campoAtivo.value = p.ativo ? "true" : "false";

    document.getElementById("tituloFormulario").textContent =
        "Editar procedimento";

    btnSalvar.innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Salvar alterações';

    btnCancelar.hidden = false;

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    campoNome.focus();
}

function limparFormulario() {
    form.reset();
    campoId.value = "";
    campoAtivo.value = "true";

    document.getElementById("tituloFormulario").textContent =
        "Novo procedimento";

    btnSalvar.innerHTML =
        '<i class="fa-solid fa-plus"></i> Salvar procedimento';

    btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", limparFormulario);


async function alterarStatusProcedimento(id) {
    const p = procedimentos.find(
        item => String(item.id) === String(id)
    );

    if (!p) return;

    const novoStatus = !p.ativo;

    const confirmacao = await Swal.fire({
        icon: "warning",
        title: novoStatus ? "Ativar procedimento?" : "Inativar procedimento?",
        text: novoStatus
            ? `Deseja ativar "${p.nome}" novamente?  Ele voltará ficar disponível para novos agendamentos.`
            : `Deseja inativar "${p.nome}"? Ele ficará indisponível para novos agendamentos.`,
        showCancelButton: true,
        confirmButtonText: novoStatus ? "Sim, ativar" : "Sim, inativar",
        cancelButtonText: "Não, cancelar",
        confirmButtonColor: novoStatus ? "#7ed77b" : "#e93e3e"
    });

    if (!confirmacao.isConfirmed) return;

    try {
        const resultado = await requisicao(API_URL, {
            method: "PUT",
            body: JSON.stringify({
                id: Number(p.id),
                nome: p.nome,
                categoria: p.categoria,
                preco: p.preco,
                duracao: p.duracao,
                ativo: novoStatus
            })
        });

        if (String(campoId.value) === String(id)) {
            limparFormulario();
        }

        await carregarProcedimentos();

        await Swal.fire({
            icon: "success",
            title: novoStatus ? "Procedimento ativado!" : "Procedimento inativado!",
            text: resultado.mensagem ||
                (novoStatus
                    ? "O procedimento foi ativado."
                    : "O procedimento foi inativado."),
            timer: 1600,
            showConfirmButton: false
        });
    } catch (erro) {
        await Swal.fire({
            icon: "error",
            title: "Não foi possível alterar o status",
            text: erro.message
        });
    }
}

document.getElementById("pesquisa")
    .addEventListener("input", renderizarProcedimentos);

document.getElementById("filtroCategoria")
    .addEventListener("change", renderizarProcedimentos);

carregarProcedimentos();
