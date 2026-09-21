/* ============================================================
   PARTE 1

   Nesta parte teremos:

   1 - Variáveis
   2 - Funções auxiliares
   3 - Buscar agendamentos no PHP
   4 - Mostrar o resumo da página

============================================================ */


/* ============================================================
   VARIÁVEIS
============================================================ */

// Data de hoje
var hoje = new Date();

// Guarda todos os agendamentos vindos do PHP
var agendamentos = [];

// Guarda o ID do atendimento selecionado
var idSelecionado = "";


/* ============================================================
   TRANSFORMAR DATA PARA YYYY-MM-DD

   Exemplo:

   29/07/2026   vira   2026-07-29

============================================================ */

function formatarDataISO(data){

    return data.toISOString().substring(0,10);

}


/* ============================================================
   ADICIONAR DIAS EM UMA DATA

   Exemplo

   hoje = 29/07

   adicionarDias(hoje,3)

   retorna

   01/08

============================================================ */

function adicionarDias(data, quantidadeDias){

    var novaData = new Date(data);

    novaData.setDate(
        novaData.getDate() + quantidadeDias
    );

    return novaData;

}


/* ============================================================
   CONVERTER HORÁRIO PARA MINUTOS

   08:30

   vira

   510 minutos

============================================================ */

function horarioParaMinutos(horario){

    var partes = horario.split(":");

    var hora = parseInt(partes[0]);

    var minuto = parseInt(partes[1]);

    return (hora * 60) + minuto;

}



/* ============================================================
   BUSCAR AGENDAMENTOS

   Faz uma requisição para

   dashboard.php?acao=listar

============================================================ */

async function buscarAgendamentos(){

    try{

        var resposta = await fetch(
            "dashboard.php?acao=listar"
        );

        var dados = await resposta.json();


        // Verifica se ocorreu erro

        if(dados.status != "sucesso"){

            throw new Error(dados.mensagem);

        }


        // Limpa o vetor

        agendamentos = [];


        // Percorre todos os agendamentos

        for(var i=0; i<dados.agendamentos.length; i++){

            var item = dados.agendamentos[i];


            agendamentos.push({

                id : item.id,

                data : item.data,

                horario : item.horario,

                cliente : item.nome,

                valor : item.valor,

                procedimento : item.procedimento,

                servico : item.servico || item.procedimento,

                status : "confirmado"

            });

        }


        // Atualiza toda a tela

        mostrarResumo();

        mostrarAgendaHoje();

        mostrarAgendaSemana();


    }catch(erro){

        var banner =
        document.getElementById("status-banner");

        banner.style.display = "block";

        banner.innerHTML =
        "Erro ao carregar agenda.<br><br>" +
        erro.message;

    }

}



/* ============================================================
   MOSTRAR RESUMO

   Atualiza os 3 cards do topo

============================================================ */

function mostrarResumo(){

    var dataHoje = formatarDataISO(hoje);

    var atendimentosHoje = [];

    var atendimentosSemana = [];



    /* ===========================================
       PROCURA OS ATENDIMENTOS DE HOJE
    =========================================== */

    for(var i=0; i<agendamentos.length; i++){

        if(agendamentos[i].data == dataHoje){

            atendimentosHoje.push(
                agendamentos[i]
            );

        }

    }



    /* ===========================================
       DESCOBRE O INÍCIO DA SEMANA

       Segunda-feira
    =========================================== */

    var inicioSemana =
        adicionarDias(
            hoje,
            -((hoje.getDay()+6)%7)
        );


    var fimSemana =
        adicionarDias(
            inicioSemana,
            6
        );


    var dataInicio =
        formatarDataISO(inicioSemana);

    var dataFim =
        formatarDataISO(fimSemana);



    /* ===========================================
       PROCURA TODOS DA SEMANA
    =========================================== */

    for(var i=0; i<agendamentos.length; i++){

        if(

            agendamentos[i].data >= dataInicio &&

            agendamentos[i].data <= dataFim

        ){

            atendimentosSemana.push(
                agendamentos[i]
            );

        }

    }



    /* ===========================================
       PROCURA O PRÓXIMO ATENDIMENTO
    =========================================== */

    var horarioAtual =

        (hoje.getHours() * 60)

        +

        hoje.getMinutes();



    var proximo = null;


    for(var i=0; i<atendimentosHoje.length; i++){

        var horario =
            horarioParaMinutos(
                atendimentosHoje[i].horario
            );


        if(horario >= horarioAtual){

            if(proximo == null){

                proximo =
                atendimentosHoje[i];

            }else{

                if(

                    horario

                    <

                    horarioParaMinutos(
                        proximo.horario
                    )

                ){

                    proximo =
                    atendimentosHoje[i];

                }

            }

        }

    }



    /* ===========================================
       MOSTRA DATA DO TOPO
    =========================================== */

    document.getElementById("lblDataAtual").innerHTML =

    hoje.toLocaleDateString(

        "pt-BR",

        {

            weekday:"long",

            day:"2-digit",

            month:"long"

        }

    );



    /* ===========================================
       CARD HOJE
    =========================================== */

    document.getElementById("cardHoje").innerHTML =

    atendimentosHoje.length;



    document.getElementById("cardHojeTexto").innerHTML =

    atendimentosHoje.length +

    " atendimento(s)";



    /* ===========================================
       CARD SEMANA
    =========================================== */

    document.getElementById("cardSemana").innerHTML =

    atendimentosSemana.length;



    /* ===========================================
       CARD PRÓXIMO
    =========================================== */

    if(proximo != null){

        document.getElementById("cardProximoHorario").innerHTML =

        proximo.horario;



        document.getElementById("cardProximoNome").innerHTML =

        proximo.cliente +

        " - " +

        proximo.servico;

    }else{

        document.getElementById("cardProximoHorario").innerHTML =

        "--";



        document.getElementById("cardProximoNome").innerHTML =

        "Nenhum atendimento restante hoje";

    }

}

/* ============================================================
   PARTE 2

   5 - Agenda de Hoje
   6 - Agenda da Semana

============================================================ */


/* ============================================================
   MOSTRAR AGENDA DE HOJE
============================================================ */

function mostrarAgendaHoje(){

    var dataHoje = formatarDataISO(hoje);

    var listaHoje = [];

    // Procura todos os atendimentos de hoje

    for(var i = 0; i < agendamentos.length; i++){

        if(agendamentos[i].data == dataHoje){

            listaHoje.push(agendamentos[i]);

        }

    }


    // Ordena por horário

    listaHoje.sort(function(a,b){

        return horarioParaMinutos(a.horario) - horarioParaMinutos(b.horario);

    });


    // Atualiza quantidade

    document.getElementById("totalHoje").innerHTML =
    listaHoje.length + " atendimento(s)";


    var html = "";


    // Caso não tenha atendimento

    if(listaHoje.length == 0){

        html += `
            <div class="day-empty">

                Nenhum atendimento hoje.

            </div>
        `;

    }
    else{

        for(var i = 0; i < listaHoje.length; i++){

            html += `

            <div class="slot"
                 onclick="abrirModal('${listaHoje[i].id}')">

                <div class="time">

                    ${listaHoje[i].horario}

                </div>

                <div class="client">

                    ${listaHoje[i].cliente}

                </div>

                <div class="service">

                    ${listaHoje[i].servico}

                </div>

            </div>

            `;

        }

    }


    document.getElementById("agendaHoje").innerHTML = html;

}



/* ============================================================
   MOSTRAR AGENDA DA SEMANA
============================================================ */

function mostrarAgendaSemana(){

    // Descobre segunda-feira

    var inicioSemana =
    adicionarDias(
        hoje,
        -((hoje.getDay()+6)%7)
    );


    var htmlSemana = "";


    // Percorre os 7 dias

    for(var dia = 0; dia < 7; dia++){

        var dataAtual =
        adicionarDias(
            inicioSemana,
            dia
        );


        var dataISO =
        formatarDataISO(dataAtual);


        htmlSemana += `

        <div class="day-col">

        `;


        // Nome do dia

        htmlSemana += `

            <div class="day-label">

                ${dataAtual.toLocaleDateString(

                    "pt-BR",

                    {

                        weekday:"short"

                    }

                )}

            </div>

        `;


        // Número do dia

        htmlSemana += `

            <div class="day-num">

                ${dataAtual.getDate()}

            </div>

        `;


        var encontrou = false;


        // Procura os atendimentos daquele dia

        for(var i=0; i<agendamentos.length; i++){

            if(agendamentos[i].data == dataISO){

                encontrou = true;


                htmlSemana += `

                <div class="day-item"
                    onclick="abrirModal('${agendamentos[i].id}')">

                    <span class="t">

                        ${agendamentos[i].horario}

                    </span>

                    ${agendamentos[i].cliente}

                </div>

                `;

            }

        }


        // Caso não tenha nenhum atendimento

        if(encontrou == false){

            htmlSemana += `

                <div class="day-empty">

                    Livre

                </div>

            `;

        }


        htmlSemana += `

        </div>

        `;

    }


    document.getElementById("agendaSemana").innerHTML =
    htmlSemana;

}


/* ============================================================
   PARTE 3

   7 - Modal
   8 - Remarcar
   9 - Cancelar
   10 - Toast
   11 - Inicialização

============================================================ */


/* ============================================================
   ABRIR MODAL
============================================================ */

function abrirModal(id){

    idSelecionado = id;

    var atendimento = null;


    // Procura o atendimento selecionado

    for(var i=0; i<agendamentos.length; i++){

        if(agendamentos[i].id == id){

            atendimento = agendamentos[i];

            break;

        }

    }


    if(atendimento == null){

        return;

    }


    var html = "";


    html += "<h3>" + atendimento.cliente + "</h3>";

    html += "<div class='meta'>";

    html += atendimento.servico + "<br>";

    html += atendimento.data + " às " + atendimento.horario;

    html += "</div>";



    html += "<label>Nova Data</label>";

    html += "<input type='date' id='novaData' value='" + atendimento.data + "'>";



    html += "<label>Novo Horário</label>";

    html += "<input type='time' id='novoHorario' value='" + atendimento.horario + "'>";



    html += "<div class='modal-actions'>";

    html += "<button class='btn btn-primary' onclick='remarcarAgendamento()'>Remarcar</button>";

    html += "<button class='btn btn-danger' onclick='cancelarAgendamento()'>Cancelar</button>";

    html += "<button class='btn btn-ghost' onclick='fecharModal()'>Fechar</button>";

    html += "</div>";



    document.getElementById("conteudoModal").innerHTML = html;

    document.getElementById("overlay").classList.add("open");

}


/* ============================================================
   FECHAR MODAL
============================================================ */

function fecharModal(){

    document.getElementById("overlay").classList.remove("open");

    idSelecionado = "";

}


/* ============================================================
   REMARCAR AGENDAMENTO
============================================================ */

async function remarcarAgendamento(){

    var novaData =
    document.getElementById("novaData").value;

    var novoHorario =
    document.getElementById("novoHorario").value;


    var form = new FormData();

    form.append("id", idSelecionado);

    form.append("data", novaData);

    form.append("horario", novoHorario);


    try{

        var resposta = await fetch(

            "dashboard.php?acao=remarcar",

            {

                method:"POST",

                body:form

            }

        );


        var resultado =
        await resposta.json();


        showToast(resultado.mensagem);


        if(resultado.status == "sucesso"){

            fecharModal();

            buscarAgendamentos();

        }

    }
    catch(erro){

        showToast("Erro ao remarcar.");

    }

}


/* ============================================================
   CANCELAR AGENDAMENTO
============================================================ */

async function cancelarAgendamento(){

    if(!confirm("Deseja realmente cancelar este atendimento?")){

        return;

    }


    var form = new FormData();

    form.append("id", idSelecionado);


    try{

        var resposta = await fetch(

            "dashboard.php?acao=cancelar",

            {

                method:"POST",

                body:form

            }

        );


        var resultado =
        await resposta.json();


        showToast(resultado.mensagem);


        if(resultado.status == "sucesso"){

            fecharModal();

            buscarAgendamentos();

        }

    }
    catch(erro){

        showToast("Erro ao cancelar.");

    }

}


/* ============================================================
   TOAST
============================================================ */

function showToast(mensagem){

    var toast =
    document.getElementById("toast");

    toast.innerHTML = mensagem;

    toast.classList.add("show");


    setTimeout(function(){

        toast.classList.remove("show");

    },3000);

}


/* ============================================================
   BOTÃO X
============================================================ */

document.getElementById("btnFecharModal").onclick = function(){

    fecharModal();

};


/* ============================================================
   FECHAR AO CLICAR FORA
============================================================ */

document.getElementById("overlay").onclick = function(evento){

    if(evento.target.id == "overlay"){

        fecharModal();

    }

};


/* ============================================================
   INICIAR O PAINEL
============================================================ */

buscarAgendamentos();

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

function abrirModalBloqueio(){

    document.getElementById("conteudoModal").innerHTML = `

        <h3>
            Ocupar horários
        </h3>

        <div class="meta">
            Bloqueie um ou vários dias no mesmo horário.
        </div>


        <label>
            Motivo do bloqueio
        </label>

        <input
            type="text"
            id="bloqueioMotivo"
            placeholder="Ex.: Férias, compromisso, médico..."
        >


        <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
        ">

            <div>

                <label>
                    Horário inicial
                </label>

                <input
                    type="time"
                    id="bloqueioInicio"
                >

            </div>


            <div>

                <label>
                    Horário final
                </label>

                <input
                    type="time"
                    id="bloqueioFim"
                >

            </div>

        </div>


        <label style="margin-top:18px;">
            Dias do compromisso
        </label>


        <div class="tipo-bloqueio">

            <label class="opcao-tipo">

                <input
                    type="radio"
                    name="tipoDias"
                    value="intervalo"
                    checked
                    onchange="alterarTipoDias()"
                >

                <span>
                    Intervalo de dias
                </span>

            </label>


            <label class="opcao-tipo">

                <input
                    type="radio"
                    name="tipoDias"
                    value="especificos"
                    onchange="alterarTipoDias()"
                >

                <span>
                    Dias específicos
                </span>

            </label>

        </div>


        <div id="areaDiasBloqueio">

            <!-- preenchido pelo JS -->

        </div>


        <div class="modal-actions">

            <button
                class="btn btn-primary"
                onclick="salvarBloqueio()">

                <i class="fa-solid fa-lock"></i>

                Ocupar horários

            </button>


            <button
                class="btn btn-ghost"
                onclick="closeModal()">

                Cancelar

            </button>

        </div>

    `;


    document
        .getElementById("overlay")
        .classList.add("open");


    alterarTipoDias();
}
let diasBloqueio = [];

function alterarTipoDias(){

    const tipo =
        document.querySelector(
            'input[name="tipoDias"]:checked'
        ).value;


    const area =
        document.getElementById("areaDiasBloqueio");


    if(tipo === "intervalo"){

        area.innerHTML = `

            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:12px;
            ">

                <div>

                    <label>
                        Dia inicial
                    </label>

                    <input
                        type="date"
                        id="bloqueioDataInicio"
                    >

                </div>


                <div>

                    <label>
                        Dia final
                    </label>

                    <input
                        type="date"
                        id="bloqueioDataFim"
                    >

                </div>

            </div>

        `;

    }else{

        area.innerHTML = `

            <label>
                Escolha uma data
            </label>

            <div style="
                display:flex;
                gap:8px;
            ">

                <input
                    type="date"
                    id="bloqueioDataEspecifica"
                >

                <button
                    type="button"
                    class="btn btn-ghost"
                    onclick="adicionarDiaBloqueio()">

                    <i class="fa-solid fa-plus"></i>

                    Adicionar

                </button>

            </div>


            <div style="
                margin-top:15px;
            ">

                <div class="meta">
                    Dias selecionados
                </div>

                <div
                    id="listaDiasBloqueio"
                    style="margin-top:8px;"
                >

                    <div class="meta">
                        Nenhum dia selecionado.
                    </div>

                </div>

            </div>

        `;
    }
}

function adicionarDiaBloqueio(){

    const input =
        document.getElementById(
            "bloqueioDataEspecifica"
        );


    const data = input.value;


    if(!data){

        Swal.fire({

            icon: "warning",

            title: "Escolha uma data",

            text: "Selecione o dia que deseja bloquear.",

            confirmButtonColor: "#6B6E55"

        });

        return;
    }


    if(diasBloqueio.includes(data)){

        Swal.fire({

            icon: "info",

            title: "Data já adicionada",

            text: "Esse dia já está na lista.",

            confirmButtonColor: "#6B6E55"

        });

        return;
    }


    diasBloqueio.push(data);


    diasBloqueio.sort();


    input.value = "";


    atualizarListaDiasBloqueio();
}

function atualizarListaDiasBloqueio(){

    const lista =
        document.getElementById(
            "listaDiasBloqueio"
        );


    if(!lista){
        return;
    }


    if(diasBloqueio.length === 0){

        lista.innerHTML = `
            <div class="meta">
                Nenhum dia selecionado.
            </div>
        `;

        return;
    }


    lista.innerHTML =
        diasBloqueio.map((data, index) => {

            const partes = data.split("-");

            const dataFormatada =
                `${partes[2]}/${partes[1]}/${partes[0]}`;


            return `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:8px 10px;
                    margin-bottom:6px;
                    border-radius:8px;
                    background:#f5f5f5;
                ">

                    <span>
                        ${dataFormatada}
                    </span>


                    <button
                        type="button"
                        onclick="removerDiaBloqueio(${index})"
                        style="
                            border:0;
                            background:transparent;
                            color:#b33;
                            cursor:pointer;
                            font-size:16px;
                        "
                        title="Remover dia">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

            `;

        }).join("");
}

async function salvarBloqueio() {

    const motivo = document.getElementById("bloqueioMotivo").value.trim();
    const horaInicio = document.getElementById("bloqueioInicio").value;
    const horaFim = document.getElementById("bloqueioFim").value;

    const tipo = document.querySelector(
        'input[name="tipoDias"]:checked'
    ).value;

    let datas = [];

    // INTERVALO
    if(tipo === "intervalo"){

        const dataInicio = document.getElementById(
            "bloqueioDataInicio"
        ).value;

        const dataFim = document.getElementById(
            "bloqueioDataFim"
        ).value;

        if(!dataInicio || !dataFim){

            await Swal.fire({
                icon: "warning",
                title: "Datas obrigatórias",
                text: "Informe a data inicial e a data final.",
                confirmButtonColor: "#6B6E55"
            });

            return;
        }

        if(dataInicio > dataFim){

            await Swal.fire({
                icon: "warning",
                title: "Intervalo inválido",
                text: "A data final deve ser igual ou posterior à data inicial.",
                confirmButtonColor: "#6B6E55"
            });

            return;
        }

        let atual = new Date(dataInicio + "T00:00:00");
        const final = new Date(dataFim + "T00:00:00");

        while(atual <= final){

            const ano = atual.getFullYear();
            const mes = String(
                atual.getMonth() + 1
            ).padStart(2, "0");

            const dia = String(
                atual.getDate()
            ).padStart(2, "0");

            datas.push(`${ano}-${mes}-${dia}`);

            atual.setDate(
                atual.getDate() + 1
            );
        }

    }

    // DIAS ESPECÍFICOS
    else {

        datas = [...diasBloqueio];

        if(datas.length === 0){

            await Swal.fire({
                icon: "warning",
                title: "Nenhum dia selecionado",
                text: "Adicione pelo menos um dia para bloquear.",
                confirmButtonColor: "#6B6E55"
            });

            return;
        }
    }

    // HORÁRIOS
    if(!horaInicio || !horaFim){

        await Swal.fire({
            icon: "warning",
            title: "Horários obrigatórios",
            text: "Informe o horário inicial e o horário final.",
            confirmButtonColor: "#6B6E55"
        });

        return;
    }

    if(horaInicio >= horaFim){

        await Swal.fire({
            icon: "warning",
            title: "Horário inválido",
            text: "O horário final deve ser maior que o horário inicial.",
            confirmButtonColor: "#6B6E55"
        });

        return;
    }

    // CONFIRMAÇÃO
    const resultado = await Swal.fire({

        icon: "question",

        title: "Ocupar horários?",

        text:
            `Serão bloqueados ${datas.length} dia(s), ` +
            `das ${horaInicio} às ${horaFim}.`,

        showCancelButton: true,

        confirmButtonText: "Sim, bloquear",

        cancelButtonText: "Cancelar",

        confirmButtonColor: "#6B6E55",

        cancelButtonColor: "#999",

        allowOutsideClick: false,

        allowEscapeKey: false
    });

    if(!resultado.isConfirmed){
        return;
    }

    // ENVIA PARA O PHP
    const form = new FormData();

    form.append(
        "datas",
        JSON.stringify(datas)
    );

    form.append(
        "hora_inicio",
        horaInicio
    );

    form.append(
        "hora_fim",
        horaFim
    );

    form.append(
        "motivo",
        motivo || "Horário bloqueado"
    );

    try {

        const response = await fetch(
            "dashboard.php?acao=ocupar",
            {
                method: "POST",
                body: form
            }
        );

        const texto = await response.text();

        console.log("Resposta PHP:", texto);

        let data;

        try {

            data = JSON.parse(texto);

        } catch(e) {

            console.error(
                "Resposta não é JSON:",
                texto
            );

            await Swal.fire({
                icon: "error",
                title: "Erro no servidor",
                text: "O PHP retornou uma resposta inválida.",
                confirmButtonColor: "#6B6E55"
            });

            return;
        }

        if(data.status === "sucesso"){

            await Swal.fire({
                icon: "success",
                title: "Bloqueado!",
                text: data.mensagem,
                confirmButtonColor: "#6B6E55"
            });

            closeModal();

            loadAppointments();

        }

        else if(data.status === "conflito"){

            await Swal.fire({
                icon: "warning",
                title: "Horário já ocupado",
                text: data.mensagem,
                confirmButtonColor: "#6B6E55"
            });

        }

        else {

            await Swal.fire({
                icon: "error",
                title: "Não foi possível bloquear",
                text: data.mensagem || "Erro desconhecido.",
                confirmButtonColor: "#6B6E55"
            });

        }

    } catch(error){

        console.error(error);

        await Swal.fire({
            icon: "error",
            title: "Erro",
            text: "Não foi possível conectar ao servidor.",
            confirmButtonColor: "#6B6E55"
        });
    }
}s