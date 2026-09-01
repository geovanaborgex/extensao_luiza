/* ============================================================
   RELATÓRIOS
============================================================ */
console.log("Relatorios.js carregou");

var agendamentos = [];

/* ============================================================
   CALCULAR VALOR PELO PROCEDIMENTO
============================================================ */

function calcularValorProcedimento(procedimento){

    const valores = {

        "Maquiagem Profissional": 120,
        "Maquiagem Express": 80,
        "Corte": 40,
        "Hidratação + Escova": 85,
        "Escova": 45,
        "Chapa": 40,
        "Cachos/Ondas": 30,
        "Penteado": 80,
        "Tintura com Tinta Profissional": 65,
        "Tintura com Tinta da Cliente": 30,
        "Nanopigmentação": 400,
        "Design com Henna": 50,
        "Design Simples": 40,
        "Brow Lamination": 85,
        "Lash Lifting": 60,
        "Limpeza de Pele": 120,
        "Spa dos Pés": 70

    };


    if(!procedimento){
        return 0;
    }


    procedimento = procedimento.toLowerCase();


    for(let nome in valores){

        if(procedimento.includes(nome.toLowerCase())){

            return valores[nome];

        }

    }


    return 0;

}

/* ============================================================
   CARREGAR FILTRO DE PROCEDIMENTOS
============================================================ */

/* ============================================================
   CARREGAR FILTRO DE PROCEDIMENTOS
============================================================ */

function carregarFiltroProcedimentos(){

    const select = document.getElementById("filtroProcedimento");

    if(!select){
        console.log("Select filtroProcedimento não encontrado");
        return;
    }

    const procedimentos = [
        "Maquiagem Profissional",
        "Maquiagem Express",
        "Corte",
        "Hidratação + Escova",
        "Escova",
        "Chapa",
        "Cachos/Ondas",
        "Penteado",
        "Tintura com Tinta Profissional",
        "Tintura com Tinta da Cliente",
        "Nanopigmentação",
        "Design com Henna",
        "Design Simples",
        "Brow Lamination",
        "Lash Lifting",
        "Limpeza de Pele",
        "Spa dos Pés"
    ];

    // Guarda o filtro atual
    const valorAtual = select.value;

    // Limpa o select
    select.innerHTML = `
        <option value="">Todos</option>
    `;

    // Adiciona os procedimentos
    procedimentos.forEach(procedimento => {

        const option = document.createElement("option");

        option.value = procedimento;
        option.textContent = procedimento;

        select.appendChild(option);

    });

    // Mantém o filtro selecionado, se existir
    if(procedimentos.includes(valorAtual)){
        select.value = valorAtual;
    }

}

/* ============================================================
   FILTRO DE PROCEDIMENTO
============================================================ */

document.getElementById("filtroProcedimento").addEventListener(
    "change",
    function(){

        gerarRelatorio();

    }
);

/* ============================================================
   BUSCAR AGENDAMENTOS
============================================================ */

async function buscarAgendamentos(inicio = "", fim = ""){

    console.log("Entrou na função buscarAgendamentos");

    try{

        let url = "dashboard.php?acao=listar";

        if(inicio !== "" && fim !== ""){

            url += `&inicio=${inicio}&fim=${fim}`;

        }

        const resposta = await fetch(url);

        console.log("Status:", resposta.status);

        const texto = await resposta.text();

        console.log("Retorno PHP:", texto);

        const dados = JSON.parse(texto);

        if(dados.status != "sucesso"){

            alert(dados.mensagem);
            return;

        }
        agendamentos = dados.agendamentos;
        
        gerarRelatorio();

    }catch(erro){

        alert("Erro ao carregar os agendamentos.");
        console.log("ERRO:", erro);

    }

}


/* ============================================================
   DEFINIR DATAS PADRÃO
============================================================ */

function definirDatas(){

    const hoje = new Date();

    const primeiroDia = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
    );

    document.getElementById("dataInicial").value =
    primeiroDia.toISOString().substring(0,10);

    document.getElementById("dataFinal").value =
    hoje.toISOString().substring(0,10);

}


/* ============================================================
   GERAR RELATÓRIO
============================================================ */

function gerarRelatorio(){

    let totalValor = 0;
    let quantidade = 0;
    let html = "";

    const filtroProcedimento = document
        .getElementById("filtroProcedimento")
        .value
        .trim()
        .toLowerCase();

    const bloqueios = [
        "almoço",
        "almoco",
        "compromisso",
        "pilates"
    ];

    for(let i = 0; i < agendamentos.length; i++){

        let item = agendamentos[i];

        const procedimentoItem = String(
            item.procedimento || item.servico || ""
        ).trim();

        const textoEvento = (
            String(item.procedimento || "") + " " +
            String(item.servico || "")
        ).toLowerCase();

        // Filtro de procedimento
        if(
            filtroProcedimento !== "" &&
            procedimentoItem.toLowerCase() !== filtroProcedimento
        ){
            continue;
        }

        // Bloqueios
        if(bloqueios.some(b => textoEvento.includes(b))){
            console.log("BLOQUEADO:", textoEvento);
            continue;
        }

        let valorItem = Number(item.valor);

        if(valorItem == 0){

            valorItem = calcularValorProcedimento(
                item.procedimento || item.servico
            );

        }

        quantidade++;

        totalValor += valorItem;

        html += `
            <tr>
                <td>${formatarData(item.data)}</td>
                <td>${item.horario}</td>
                <td>${item.nome}</td>
                <td>${item.procedimento || item.servico || ""}</td>
                <td>R$ ${valorItem.toFixed(2).replace(".",",")}</td>
            </tr>
        `;
    }

    if(html == ""){

        html = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px">
                    Nenhum agendamento encontrado.
                </td>
            </tr>
        `;

    }

    document.getElementById("cardAgendamentos").innerHTML =
        quantidade;

    document.getElementById("cardValor").innerHTML =
        "R$ " + totalValor.toFixed(2).replace(".",",");

    document.getElementById("corpoTabela").innerHTML =
        html;
}

/* ============================================================
   FORMATAR DATA
============================================================ */

function formatarData(data){

    let partes = data.split("-");

    return partes[2]+"/"+partes[1]+"/"+partes[0];

}


/* ============================================================
   BOTÃO GERAR
============================================================ */

document.getElementById("btnGerar").onclick = () => {

    const inicio = document.getElementById("dataInicial").value;
    const fim = document.getElementById("dataFinal").value;

    buscarAgendamentos(inicio, fim);

};

/* ============================================================
   ABRIR MENU TOGGLE
============================================================ */


const menuToggle=document.getElementById("menuToggle");
const sidebar=document.querySelector(".sidebar");
const menuOverlay=document.getElementById("menuOverlay");

menuToggle.addEventListener("click",()=>{
  sidebar.classList.toggle("open");
  menuOverlay.classList.toggle("active");
});

menuOverlay.addEventListener("click",()=>{
  sidebar.classList.remove("open");
  menuOverlay.classList.remove("active");
});

document.querySelectorAll(".sidebar a").forEach(link=>{
  link.addEventListener("click",()=>{
    sidebar.classList.remove("open");
    menuOverlay.classList.remove("active");
  });
});

/* ============================================================
   INICIAR
============================================================ */

carregarFiltroProcedimentos();

definirDatas();

const inicio = document.getElementById("dataInicial").value;
const fim = document.getElementById("dataFinal").value;

buscarAgendamentos(inicio, fim);