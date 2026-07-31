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


    const bloqueios = [
        "almoço",
        "almoco",
        "compromisso",
        "pilates"
    ];


    for(let i=0;i<agendamentos.length;i++){

        let item = agendamentos[i];


        const textoEvento = (
            String(item.procedimento || "") + " " +
            String(item.servico || "")
        ).toLowerCase();



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

            <td>${item.procedimento}</td>

             <td>R$ ${valorItem.toFixed(2).replace(".",",")}</td>

        </tr>

        `;


    }


    if(html==""){

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
   INICIAR
============================================================ */

definirDatas();

const inicio = document.getElementById("dataInicial").value;
const fim = document.getElementById("dataFinal").value;

buscarAgendamentos(inicio, fim);