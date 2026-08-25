const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzi6lqvkYaP68l3hyxCR46BzUj1CLJH6pPfqljiwAY_81crRpVkG270swYIy-IuE6HZ/exec";
const SENHA_PADRAO = "1234";
let horaAtualCapturada = "";

function validarSenhaApp() {
  const senhaDigitada = document.getElementById('inputSenhaApp').value;
  const senhaSalva = localStorage.getItem('cfg_senha_app') || SENHA_PADRAO;

  if (senhaDigitada === senhaSalva) {
    document.getElementById('lockScreen').style.display = 'none';
    document.getElementById('inputSenhaApp').value = '';
  } else {
    alert("❌ Senha incorreta!");
    document.getElementById('inputSenhaApp').value = '';
  }
}

function verificarSenhaEnter(event) {
  if (event.key === 'Enter') {
    validarSenhaApp();
  }
}

function alterarSenhaApp() {
  const senhaAtualSalva = localStorage.getItem('cfg_senha_app') || SENHA_PADRAO;
  const atual = prompt("Digite a senha ATUAL:");
  
  if (atual === null) return;
  
  if (atual === senhaAtualSalva) {
    const nova = prompt("Digite a NOVA senha:");
    if (nova && nova.trim() !== "") {
      localStorage.setItem('cfg_senha_app', nova.trim());
      alert("✅ Senha alterada com sucesso!");
    } else {
      alert("⚠️ A senha não pode ser vazia.");
    }
  } else {
    alert("❌ Senha atual incorreta.");
  }
}

function exibirToast(mensagem) {
  const toast = document.getElementById('toast-aviso');
  toast.innerText = mensagem;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function toggleMenu(e) { 
  if(e) e.stopPropagation(); 
  document.getElementById('dropdownMenu').classList.toggle('active'); 
}

function closeMenu() { 
  document.getElementById('dropdownMenu').classList.remove('active'); 
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('btnMenu');
  if (menu && !menu.contains(e.target) && e.target !== btn) closeMenu();
});

function alternarAba(aba) {
  document.getElementById('tab-ponto').classList.toggle('active', aba === 'ponto');
  document.getElementById('tab-relatorio').classList.toggle('active', aba === 'relatorio');
  document.getElementById('btn-tab-ponto').classList.toggle('active', aba === 'ponto');
  document.getElementById('btn-tab-relatorio').classList.toggle('active', aba === 'relatorio');
  if (aba === 'relatorio') carregarRelatorio();
  else carregarPontosHoje();
}

function obterDataHojeFormatada() {
  const h = new Date();
  const dia = String(h.getDate()).padStart(2, '0');
  const mes = String(h.getMonth() + 1).padStart(2, '0');
  const ano = h.getFullYear();
  return { exibicao: `${dia}/${mes}/${ano}`, chave: `ponto_${ano}-${mes}-${dia}`, mesAno: `${mes}/${ano}` };
}

function calcularDistanciaEmMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function validarEBatendoPonto() {
  const localCoords = localStorage.getItem('cfg_local_coords');
  const nomeEmpresa = localStorage.getItem('cfg_local_nome') || 'Empresa';
  const raioPermitido = parseFloat(localStorage.getItem('cfg_local_raio') || '100');

  if (!localCoords) {
    alert("⚠️ Lançamento Bloqueado: As coordenadas do local não foram configuradas no menu!");
    return;
  }

  if (!navigator.geolocation) {
    alert("⚠️ Geolocalização não é suportada por este dispositivo.");
    return;
  }

  const partes = localCoords.split(',');
  if (partes.length !== 2) {
    alert("⚠️ As coordenadas configuradas são inválidas.");
    return;
  }

  const latEmpresa = parseFloat(partes[0].trim());
  const lonEmpresa = parseFloat(partes[1].trim());

  document.getElementById('txt-status-gps').innerHTML = `📍 Obtendo sua localização...`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latAtual = pos.coords.latitude;
      const lonAtual = pos.coords.longitude;
      const distancia = Math.round(calcularDistanciaEmMetros(latEmpresa, lonEmpresa, latAtual, lonAtual));

      if (distancia <= raioPermitido) {
        document.getElementById('txt-status-gps').innerHTML = `📍 Trava de GPS: ${nomeEmpresa}`;
        registrarPontoAtual();
      } else {
        document.getElementById('txt-status-gps').innerHTML = `
          📍 Trava de GPS: ${nomeEmpresa}
          <div class="status-gps-erro">Fora do perímetro (${distancia}m)</div>
        `;
        alert(`🚫 Ponto não registrado! Você está a ${distancia} metros do local permitido. Raio máximo: ${raioPermitido}m.`);
      }
    },
    (err) => {
      document.getElementById('txt-status-gps').innerHTML = `
        📍 Trava de GPS: ${nomeEmpresa}
        <div class="status-gps-erro">GPS Desativado/Negado</div>
      `;
      alert("⚠️ Não foi possível obter sua localização. Ative o GPS do aparelho para bater o ponto.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function carregarPontosHoje() {
  const info = obterDataHojeFormatada();
  document.getElementById('txt-data').innerText = info.exibicao;
  if (!document.getElementById('filtro-mes').value) {
    document.getElementById('filtro-mes').value = info.mesAno;
  }

  const reg = JSON.parse(localStorage.getItem(info.chave)) || {};
  document.getElementById('val-e').innerText = reg.e || '--:--';
  document.getElementById('val-si').innerText = reg.si || '--:--';
  document.getElementById('val-vi').innerText = reg.vi || '--:--';
  document.getElementById('val-sf').innerText = reg.sf || '--:--';

  let proxText = "Próximo Registro: Entrada";
  if (reg.e && !reg.si && !reg.sf) proxText = "Próximo Registro: Saída Intervalo ou Saída Final";
  else if (reg.si && !reg.vi) proxText = "Próximo Registro: Volta Intervalo";
  else if (reg.vi && !reg.sf) proxText = "Próximo Registro: Saída Final";
  else if (reg.sf) proxText = "Todos os registros efetuados hoje!";
  document.getElementById('txt-proximo').innerText = proxText;

  const localCfg = localStorage.getItem('cfg_local_nome');
  if (localCfg) {
    document.getElementById('txt-status-gps').innerHTML = `📍 Trava de GPS: ${localCfg}`;
  } else {
    document.getElementById('txt-status-gps').innerHTML = `⚠️ GPS Não Configurado`;
  }
}

function registrarPontoAtual() {
  const info = obterDataHojeFormatada();
  let reg = JSON.parse(localStorage.getItem(info.chave)) || {};
  const h = new Date();
  horaAtualCapturada = `${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`;

  if (!reg.e) {
    if (confirm(`Confirmar lançamento de ENTRADA às ${horaAtualCapturada}?`)) {
      reg.e = horaAtualCapturada;
      localStorage.setItem(info.chave, JSON.stringify(reg));
      carregarPontosHoje();
      alert(`Ponto (ENTRADA) registrado com sucesso às ${horaAtualCapturada}!`);
    }
  } else if (!reg.si && !reg.sf) {
    document.getElementById('txt-hora-modal-saida').innerText = horaAtualCapturada;
    document.getElementById('modalTipoSaida').classList.add('active');
  } else if (reg.si && !reg.vi) {
    if (confirm(`Confirmar lançamento de VOLTA INTERVALO às ${horaAtualCapturada}?`)) {
      reg.vi = horaAtualCapturada;
      localStorage.setItem(info.chave, JSON.stringify(reg));
      carregarPontosHoje();
      alert(`Ponto (VOLTA INTERVALO) registrado com sucesso às ${horaAtualCapturada}!`);
    }
  } else if (!reg.sf) {
    if (confirm(`Confirmar lançamento de SAÍDA FINAL às ${horaAtualCapturada}?`)) {
      reg.sf = horaAtualCapturada;
      localStorage.setItem(info.chave, JSON.stringify(reg));
      carregarPontosHoje();
      alert(`Ponto (SAÍDA FINAL) registrado com sucesso às ${horaAtualCapturada}!`);
    }
  } else {
    alert("Todas as marcações de hoje foram concluídas!");
  }
}

function confirmarTipoSaida(tipo) {
  fecharModal('modalTipoSaida');
  const info = obterDataHojeFormatada();
  let reg = JSON.parse(localStorage.getItem(info.chave)) || {};

  if (tipo === 'si') {
    reg.si = horaAtualCapturada;
    localStorage.setItem(info.chave, JSON.stringify(reg));
    carregarPontosHoje();
    alert(`Ponto (SAÍDA INTERVALO) registrado com sucesso às ${horaAtualCapturada}!`);
  } else if (tipo === 'sf') {
    reg.sf = horaAtualCapturada;
    localStorage.setItem(info.chave, JSON.stringify(reg));
    carregarPontosHoje();
    alert(`Ponto (SAÍDA FINAL) registrado com sucesso às ${horaAtualCapturada}!`);
  }
}

function convHora(h) {
  if (!h) return 0;
  const str = String(h).trim();
  if (!str.includes(':')) return 0;
  const p = str.split(':');
  return (parseInt(p[0], 10) * 60) + parseInt(p[1], 10);
}

function abrirModalConfigJornada() {
  document.getElementById('cfg-seg-qui-e').value = localStorage.getItem('cfg_seg_qui_e') || '07:00';
  document.getElementById('cfg-seg-qui-s').value = localStorage.getItem('cfg_seg_qui_s') || '17:00';
  document.getElementById('cfg-sex-s').value = localStorage.getItem('cfg_sex_s') || '16:00';
  document.getElementById('cfg-sab-alternado').checked = localStorage.getItem('cfg_sab_alternado') === 'true';
  document.getElementById('cfg-sab-e').value = localStorage.getItem('cfg_sab_e') || '07:00';
  document.getElementById('cfg-sab-s').value = localStorage.getItem('cfg_sab_s') || '11:00';
  
  document.getElementById('modalJornada').classList.add('active');
}

function salvarConfigJornada() {
  localStorage.setItem('cfg_seg_qui_e', document.getElementById('cfg-seg-qui-e').value);
  localStorage.setItem('cfg_seg_qui_s', document.getElementById('cfg-seg-qui-s').value);
  localStorage.setItem('cfg_sex_s', document.getElementById('cfg-sex-s').value);
  localStorage.setItem('cfg_sab_alternado', document.getElementById('cfg-sab-alternado').checked);
  localStorage.setItem('cfg_sab_e', document.getElementById('cfg-sab-e').value);
  localStorage.setItem('cfg_sab_s', document.getElementById('cfg-sab-s').value);

  fecharModal('modalJornada');
  carregarRelatorio();
  alert("Jornada salva com sucesso!");
}

function carregarRelatorio() {
  const lista = document.getElementById('lista-relatorio');
  lista.innerHTML = '';

  const filtroMes = document.getElementById('filtro-mes').value.trim();
  const apenasIncompletos = document.getElementById('chk-incompletos').checked;

  const segQuiE = localStorage.getItem('cfg_seg_qui_e') || '07:00';
  const segQuiS = localStorage.getItem('cfg_seg_qui_s') || '17:30';
  const sexS = localStorage.getItem('cfg_sex_s') || '16:30';
  const sabAlternado = localStorage.getItem('cfg_sab_alternado') === 'true';
  const sabE = localStorage.getItem('cfg_sab_e') || '07:00';
  const sabS = localStorage.getItem('cfg_sab_s') || '11:00';

  let chaves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('ponto_')) chaves.push(k);
  }

  chaves.sort().reverse();

  if (chaves.length === 0) {
    lista.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">Nenhum ponto registrado no sistema.</div>';
    return;
  }

  let exibidos = 0;
  let minExtrasTotalAcumulado = 0;
  const salarioBase = parseFloat(localStorage.getItem('cfg_salario') || 2000);
  const horasMes = parseFloat(localStorage.getItem('cfg_horas_mes') || 220);
  const valorHoraExtra = (salarioBase / horasMes) * 1.5;

  chaves.forEach((chave) => {
    const item = JSON.parse(localStorage.getItem(chave)) || {};
    const p = chave.replace('ponto_', '').split('-');
    if (p.length !== 3) return;

    const ano = parseInt(p[0], 10);
    const mes = parseInt(p[1], 10) - 1;
    const dia = parseInt(p[2], 10);
    const dataObj = new Date(ano, mes, dia);
    const diaSemana = dataObj.getDay();

    const dataFmt = `${p[2]}/${p[1]}/${p[0]}`;
    const mesAno = `${p[1]}/${p[0]}`;

    if (filtroMes && mesAno !== filtroMes) return;

    const isIncompleto = !item.e || (!item.si && !item.sf) || (item.si && !item.vi) || (item.vi && !item.sf);
    if (apenasIncompletos && !isIncompleto) return;

    let eDiaTrabalhado = true;
    let horaEntradaPrevista = segQuiE;
    let horaSaidaPrevista = segQuiS;

    if (diaSemana === 0 || diaSemana === 6) { 
      if (diaSemana === 6 && !sabAlternado) {
        horaEntradaPrevista = sabE;
        horaSaidaPrevista = sabS;
      } else {
        eDiaTrabalhado = false;
      }
    } else if (diaSemana === 5) { 
      horaSaidaPrevista = sexS;
    }

    const minPrevistoEntrada = convHora(horaEntradaPrevista);
    const minPrevistoSaida = convHora(horaSaidaPrevista);

    let minExtraDia = 0;
    let extraTexto = "00:00 (R$ 0,00)";
    let intervaloTarde = "--:-- - --:--";

    if (item.e || item.sf) {
      let minEntradaReal = convHora(item.e);
      let minSaidaReal = convHora(item.sf);

      if (!eDiaTrabalhado) {
        if (minEntradaReal > 0 && minSaidaReal > 0) {
          if (item.si && item.vi) {
            let m1 = minEntradaReal;
            let m2 = convHora(item.si);
            let m3 = convHora(item.vi);
            let m4 = minSaidaReal;
            minExtraDia = (m2 - m1) + (m4 - m3);
          } else {
            minExtraDia = minSaidaReal - minEntradaReal;
          }
          intervaloTarde = `${item.e || '--:--'} - ${item.sf || '--:--'}`;
        }
      } else {
        if (minEntradaReal > 0 && (minPrevistoEntrada - minEntradaReal) >= 30) {
          minExtraDia += (minPrevistoEntrada - minEntradaReal);
        }

        if (minSaidaReal > 0 && (minSaidaReal - minPrevistoSaida) >= 30) {
          minExtraDia += (minSaidaReal - minPrevistoSaida);
          intervaloTarde = `${horaSaidaPrevista} - ${item.sf}`;
        }
      }

      if (item.hora_extra) {
        extraTexto = `${item.hora_extra}`;
      } else if (minExtraDia > 0) {
        minExtrasTotalAcumulado += minExtraDia;
        let hEx = Math.floor(minExtraDia / 60);
        let mEx = minExtraDia % 60;
        let valEx = (minExtraDia / 60) * valorHoraExtra;
        extraTexto = `${String(hEx).padStart(2,'0')}:${String(mEx).padStart(2,'0')} (R$ ${valEx.toFixed(2).replace('.',',')})`;
      }
    }

    exibidos++;
    const card = document.createElement('div');
    card.className = 'relatorio-card-item';
    card.onclick = () => editarPontoExistente(chave, dataFmt);
    card.innerHTML = `
      <div class="relatorio-linha">📅 <strong>Data: ${dataFmt}</strong></div>
      <div class="relatorio-linha">🟩 Ent: ${item.e || '--:--'} | Sai Almoço: ${item.si || '--:--'}</div>
      <div class="relatorio-linha">🟥 Vol Almoço: ${item.vi || '--:--'} | Fim: ${item.sf || '--:--'}</div>
      <div class="relatorio-linha">⭐ Total Extra: ${extraTexto}</div>
      <div class="relatorio-linha">🏢 Extra Tarde: ${intervaloTarde}</div>
    `;
    lista.appendChild(card);
  });

  const hTotal = Math.floor(minExtrasTotalAcumulado / 60);
  const mTotal = minExtrasTotalAcumulado % 60;
  const vTotal = (minExtrasTotalAcumulado / 60) * valorHoraExtra;

  document.getElementById('txt-total-horas').innerText = `${String(hTotal).padStart(2,'0')}:${String(mTotal).padStart(2,'0')}`;
  document.getElementById('txt-total-valor').innerText = `R$ ${vTotal.toFixed(2).replace('.',',')}`;

  if (exibidos === 0) {
    lista.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">Nenhum registro encontrado para "${filtroMes}".</div>`;
  }
}

function sincronizarComGoogleSheets(silencioso = false) {
  window.processarDadosSheets = function(dados) {
    if (!dados || dados.status === "error") {
      if (!silencioso) alert("Erro na planilha: " + (dados ? dados.message : "Vazia"));
      return;
    }

    if (!Array.isArray(dados) || dados.length === 0) {
      if (!silencioso) alert("Sincronização concluída, mas sem registros.");
      return;
    }

    let importados = 0;
    let ultimoMesAno = "";

    function formatarHoraGoogleSheets(valor) {
      if (!valor) return '';
      let str = String(valor).trim();
      if (/^\d{1,2}:\d{2}/.test(str)) {
        let partes = str.split(':');
        return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
      }
      let dateObj = new Date(valor);
      if (!isNaN(dateObj.getTime())) {
        let h = String(dateObj.getHours()).padStart(2, '0');
        let m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
      return '';
    }

    dados.forEach(item => {
      let rawData = item.data || item.Data;
      if (rawData) {
        let dataStr = String(rawData).trim();
        if (dataStr.includes('T')) {
          let dateObj = new Date(dataStr);
          let dia = String(dateObj.getUTCDate()).padStart(2, '0');
          let mes = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          let ano = dateObj.getUTCFullYear();
          dataStr = `${dia}/${mes}/${ano}`;
        }

        let partes = dataStr.split('/');
        if (partes.length === 3) {
          let dia = partes[0].trim().padStart(2, '0');
          let mes = partes[1].trim().padStart(2, '0');
          let ano = partes[2].trim();
          if (ano.length === 2) ano = `20${ano}`;

          let chave = `ponto_${ano}-${mes}-${dia}`;
          ultimoMesAno = `${mes}/${ano}`;

          let registro = {
            e: formatarHoraGoogleSheets(item.entrada),
            si: formatarHoraGoogleSheets(item.saida_intervalo),
            vi: formatarHoraGoogleSheets(item.volta_intervalo),
            sf: formatarHoraGoogleSheets(item.saida_final),
            hora_extra: item.hora_extra || '',
            percentual: item.percentual || ''
          };

          localStorage.setItem(chave, JSON.stringify(registro));
          importados++;
        }
      }
    });

    if (ultimoMesAno) document.getElementById('filtro-mes').value = ultimoMesAno;
    carregarPontosHoje();
    carregarRelatorio();
    exibirToast("Sincronização OK!");
  };

  const oldScript = document.getElementById('jsonp-sheets-script');
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.id = 'jsonp-sheets-script';
  script.src = `${GOOGLE_SHEETS_URL}?sheet=ATUALIZADA&callback=processarDadosSheets&t=${new Date().getTime()}`;
  document.body.appendChild(script);
}

function abrirModalConfigLocal() {
  document.getElementById('cfg-local-nome').value = localStorage.getItem('cfg_local_nome') || '';
  document.getElementById('cfg-local-coords').value = localStorage.getItem('cfg_local_coords') || '';
  document.getElementById('cfg-local-raio').value = localStorage.getItem('cfg_local_raio') || '100';
  document.getElementById('modalLocal').classList.add('active');
}

function obterGpsAtual() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        document.getElementById('cfg-local-coords').value = coords;
        alert("Coordenadas capturadas!");
      },
      (err) => { alert("Erro ao obter GPS: " + err.message); },
      { enableHighAccuracy: true }
    );
  } else {
    alert("Geolocalização não é suportada neste navegador.");
  }
}

function salvarConfigLocal() {
  const nome = document.getElementById('cfg-local-nome').value.trim() || 'Sede';
  const coords = document.getElementById('cfg-local-coords').value.trim();
  const raio = document.getElementById('cfg-local-raio').value;

  localStorage.setItem('cfg_local_nome', nome);
  localStorage.setItem('cfg_local_coords', coords);
  localStorage.setItem('cfg_local_raio', raio);

  fecharModal('modalLocal');
  carregarPontosHoje();
  alert("Local configurado com sucesso! A trava GPS está ativa.");
}

function recalcularHistorico() {
  carregarRelatorio();
  alert("Histórico recalculado com sucesso!");
}

function abrirModalPontoManual() {
  document.getElementById('modal-title-data').innerText = 'Ponto Manual';
  document.getElementById('edit-chave').value = '';
  document.getElementById('edit-data-input').value = '';
  document.getElementById('edit-e').value = '';
  document.getElementById('edit-si').value = '';
  document.getElementById('edit-vi').value = '';
  document.getElementById('edit-sf').value = '';
  document.getElementById('group-data-manual').style.display = 'block';
  document.getElementById('btn-excluir-ponto').style.display = 'none';
  document.getElementById('modalEdicao').classList.add('active');
}

function editarPontoExistente(chave, dataFmt) {
  const reg = JSON.parse(localStorage.getItem(chave)) || {};
  document.getElementById('modal-title-data').innerText = `Editar Ponto (${dataFmt})`;
  document.getElementById('edit-chave').value = chave;
  document.getElementById('edit-data-input').value = dataFmt;
  document.getElementById('group-data-manual').style.display = 'none';
  document.getElementById('edit-e').value = reg.e || '';
  document.getElementById('edit-si').value = reg.si || '';
  document.getElementById('edit-vi').value = reg.vi || '';
  document.getElementById('edit-sf').value = reg.sf || '';
  document.getElementById('btn-excluir-ponto').style.display = 'inline-block';
  document.getElementById('modalEdicao').classList.add('active');
}

function excluirPonto() {
  const chave = document.getElementById('edit-chave').value;
  if (!chave) return;

  if (confirm("Tem certeza que deseja excluir o ponto desta data?")) {
    localStorage.removeItem(chave);
    fecharModal('modalEdicao');
    carregarRelatorio();
    carregarPontosHoje();
    alert("Registro excluído com sucesso!");
  }
}

function abrirModalConfigSalario() { 
  document.getElementById('modalSalario').classList.add('active'); 
}

function fecharModal(id) { 
  document.getElementById(id).classList.remove('active'); 
}

function salvarConfigSalario() {
  localStorage.setItem('cfg_salario', document.getElementById('cfg-salario-val').value);
  localStorage.setItem('cfg_horas_mes', document.getElementById('cfg-horas-mes').value);
  fecharModal('modalSalario');
  carregarRelatorio();
  alert("Configuração de Salário salva!");
}

function salvarEdicao() {
  let chave = document.getElementById('edit-chave').value;
  if (!chave) {
    const txt = document.getElementById('edit-data-input').value.trim();
    const p = txt.split('/');
    if (p.length !== 3) { alert("Data inválida. Use DD/MM/YYYY"); return; }
    chave = `ponto_${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  }

  const reg = {
    e: document.getElementById('edit-e').value,
    si: document.getElementById('edit-si').value,
    vi: document.getElementById('edit-vi').value,
    sf: document.getElementById('edit-sf').value
  };

  localStorage.setItem(chave, JSON.stringify(reg));
  fecharModal('modalEdicao');
  carregarRelatorio();
  carregarPontosHoje();
}

function fazerBackupJSON() {
  let dados = {};
  for (let i = 0; i < localStorage.length; i++) {
    let k = localStorage.key(i);
    dados[k] = localStorage.getItem(k);
  }
  let blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup_ponto.json';
  a.click();
}

function triggerImportarJSON() { 
  document.getElementById('fileInputJSON').click(); 
}

function importarJSON(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    try {
      let dados = JSON.parse(evt.target.result);
      Object.keys(dados).forEach(k => localStorage.setItem(k, dados[k]));
      alert("Backup restaurado com sucesso!");
      carregarPontosHoje();
      carregarRelatorio();
    } catch(err) { alert("Arquivo JSON inválido."); }
  };
  reader.readAsText(file);
}

function exportarCSV() {
  let csv = "Data;Entrada;Saida_Intervalo;Volta_Intervalo;Saida_Final\n";
  for (let i = 0; i < localStorage.length; i++) {
    let k = localStorage.key(i);
    if (k.startsWith('ponto_')) {
      let p = k.replace('ponto_', '').split('-');
      let item = JSON.parse(localStorage.getItem(k));
      csv += `${p[2]}/${p[1]}/${p[0]};${item.e||''};${item.si||''};${item.vi||''};${item.sf||''}\n`;
    }
  }
  let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relatorio_pontos.csv';
  a.click();
}

function sairApp() { 
  if(confirm("Deseja fechar a aplicação?")) window.close(); 
}

window.onload = function() {
  carregarPontosHoje();
  carregarRelatorio();
  sincronizarComGoogleSheets(true);
};

