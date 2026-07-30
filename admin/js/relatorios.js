/* ============================================================
   RELATÓRIOS
============================================================ */
console.log("Relatorios.js carregou");

var agendamentos = [];


/* ============================================================
   BUSCAR AGENDAMENTOS
============================================================ */

async function buscarAgendamentos(){
    console.log("Entrou na função carregarRelatorios");


    try{


        const resposta = await fetch("dashboard.php?acao=listar");

        console.log("Status:", resposta.status);


        const texto = await resposta.text();


        console.log("Retorno PHP:", texto);


        const dados = JSON.parse(texto);

        if(dados.status != "sucesso"){

            alert(dados.mensagem);

            return;

        }

        agendamentos = dados.agendamentos;

        definirDatas();

        gerarRelatorio();

    }catch(erro){

        alert("Erro ao carregar os agendamentos.");
        console.log("ERRO:", erro);

    }

}


/* ============================================================
   DEFINIR DATAS PADRÃO

   Primeiro dia do mês até hoje
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

    const inicio =
    document.getElementById("dataInicial").value;

    const fim =
    document.getElementById("dataFinal").value;

    let totalValor = 0;

    let quantidade = 0;

    let html = "";



    for(let i=0;i<agendamentos.length;i++){

        let item = agendamentos[i];
    
    
        console.log("ANALISANDO:", item.procedimento, item.servico);
    
    
        const bloqueios = [
            "almoço",
            "almoco",
            "compromisso",
            "pilates"
        ];
    
    
        const textoEvento = (
            String(item.procedimento || "") + " " +
            String(item.servico || "")
        ).toLowerCase();
    
    
        if(bloqueios.some(b => textoEvento.includes(b))){
            console.log("BLOQUEADO:", textoEvento);
            continue;
        }
    
    
        if(item.data < inicio) continue;
    
        if(item.data > fim) continue;
    
    
        quantidade++;
    
        totalValor += Number(item.valor);



    if(html==""){

        html = `

        <tr>

            <td colspan="5">

                Nenhum agendamento encontrado.

            </td>

        </tr>

        `;

    }



    document.getElementById("cardAgendamentos").innerHTML =
    quantidade;



    document.getElementById("cardValor").innerHTML =
    "R$ " +
    totalValor
        .toFixed(2)
        .replace(".",",");



    document.getElementById("corpoTabela").innerHTML =
    html;

    }
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

document
.getElementById("btnGerar")
.onclick = gerarRelatorio;


/* ============================================================
   INICIAR
============================================================ */

buscarAgendamentos();