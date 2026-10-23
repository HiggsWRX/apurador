import type { ChavesDaNoite } from "@apurador/coletor";
import type { Feature, MultiLineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { feature, mesh } from "topojson-client";
import type { IdDaBase } from "../lib/bases-da-projecao";
import { antesDaPrimeiraLeitura, type QuadroAoVivo } from "../lib/leitor-ao-vivo";
import { caminhoDaMalha, type MalhaDasUfs, type MalhaDosMunicipios } from "../lib/malha";
import { mapaDosLugares, type ModoDoMapa } from "../lib/mapa-dos-lugares";
import { mostrarOCartao, useBaseDaPagina, useQuadroDaPagina } from "../lib/quadro-da-pagina";
import { caminhoDaTabelaDeLugares, ORDEM_INICIAL, tabelaDosLugares, type ArquivoDaTabelaDeLugares } from "../lib/tabela-dos-lugares";
import { MapaDosLugares } from "./MapaDosLugares";
import { TabelaDosLugares } from "./TabelaDosLugares";

// A ilha do cartão do mapa, em cada página de lugar (Telas da página de lugar, decisão 8), que alterna Mapa | Tabela. A
// ilha não lê os arquivos ao vivo: desenha o quadro e a base que a ilha do bloco ao vivo publica
// (`lib/quadro-da-pagina.ts`). Quando o cartão chega perto da tela, ela baixa a tabela de lugares do build e a malha do
// mapa e avisa o bloco, que passa a ler o mapa.json e a tabela de projeções: antes disso, nada disso é baixado. No
// build, sai só o título, com a nota de que os lugares vêm a seguir.
// - O mapa (ticket 26): no Brasil, por estados, com a troca para municípios, que baixa a malha deles e as tabelas de
//   lugares das 27 UFs (a posição de cada município no mapa.json e o 1º turno dele); numa UF, os municípios dela; num
//   município, os da UF, com ele destacado. O Exterior não tem mapa, só a tabela das cidades. Com a chave do mapa
//   desligada, o cartão mostra só a Tabela, que não olha a chave: ela é a alternativa ao mapa, sempre no ar.
// - A tabela: numa página de município, abre rolada até ele.

interface Props {
  /** O id do lugar da página, que o mapa e a tabela destacam quando ele está neles, como um município entre os da UF. */
  id: string;
  /** O lugar cujos lugares o cartão mostra: o da página, ou a UF (ou o Exterior) de um município. */
  lugarDaTabela: string;
  titulo: string;
  /** As chaves da noite do arquivo de chaves do site, que valem até a primeira rodada do coletor. */
  chaves: ChavesDaNoite;
}

/** Quanto antes de entrar na tela o cartão começa a baixar o que mostra. */
const ANTES_DA_TELA = "300px";

/** Os arquivos do build que o cartão baixa, cada um uma vez por página. */
const baixados = new Map<string, Promise<unknown>>();
function baixar<T>(caminho: string): Promise<T> {
  let pedido = baixados.get(caminho);
  if (!pedido) {
    pedido = fetch(caminho).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
    baixados.set(caminho, pedido);
    // Um pedido que falhou não fica guardado: a próxima troca de vista tenta de novo.
    pedido.catch(() => baixados.delete(caminho));
  }
  return pedido as Promise<T>;
}

/** A ilha do cartão do mapa de um lugar. */
export default function CartaoDoMapa({ id, lugarDaTabela, titulo, chaves }: Props) {
  const quadro = useQuadroDaPagina(antesDaPrimeiraLeitura(chaves));
  const base = useBaseDaPagina();
  const [arquivo, setArquivo] = useState<ArquivoDaTabelaDeLugares | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [ordem, setOrdem] = useState(ORDEM_INICIAL);
  const [vista, setVista] = useState<"mapa" | "tabela">("mapa");
  const [nivel, setNivel] = useState<"estados" | "municipios">("estados");
  const [modo, setModo] = useState<ModoDoMapa>("placar");
  const raiz = useRef<HTMLElement>(null);
  const atual = id === lugarDaTabela ? undefined : id;
  const comMapa = lugarDaTabela !== "ZZ" && quadro.chaves.mapa;
  const naTabela = !comMapa || vista === "tabela";

  useEffect(() => {
    const cartao = raiz.current;
    if (!cartao) return;
    const observador = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        observador.disconnect();
        mostrarOCartao();
        baixar<ArquivoDaTabelaDeLugares>(caminhoDaTabelaDeLugares(lugarDaTabela)).then(setArquivo, () => setFalhou(true));
      },
      { rootMargin: ANTES_DA_TELA },
    );
    observador.observe(cartao);
    return () => observador.disconnect();
  }, [lugarDaTabela]);

  // A tabela de uma UF tem centenas de municípios, e o da página estaria escondido no meio dela: ela abre rolada até ele,
  // sem mexer na rolagem da página.
  useEffect(() => {
    const linha = arquivo && naTabela ? raiz.current?.querySelector<HTMLElement>("tr[aria-current]") : null;
    const caixa = linha?.closest<HTMLElement>(".tabela-dos-lugares");
    if (!linha || !caixa) return;
    caixa.scrollTop += linha.getBoundingClientRect().top - caixa.getBoundingClientRect().top - caixa.clientHeight / 2;
  }, [arquivo, naTabela]);

  return (
    <section ref={raiz} class="cartao cartao-do-mapa" data-cartao-do-mapa aria-labelledby="cartao-do-mapa-titulo">
      <h2 id="cartao-do-mapa-titulo">{titulo}</h2>
      {comMapa && (
        <Alternancia
          rotulo="Mapa ou tabela"
          opcoes={[
            ["mapa", "Mapa"],
            ["tabela", "Tabela"],
          ]}
          escolhida={vista}
          aoEscolher={setVista}
        />
      )}
      {!arquivo ? (
        <p class="nota">{falhou ? "Os lugares não carregaram. Recarregue a página para tentar de novo." : "Os lugares carregam quando chegam à tela."}</p>
      ) : naTabela ? (
        <TabelaDosLugares tabela={tabelaDosLugares({ arquivo, quadro, base })} ordem={ordem} aoOrdenar={setOrdem} atual={atual} />
      ) : (
        <>
          {lugarDaTabela === "BR" && (
            <Alternancia
              rotulo="Estados ou municípios"
              opcoes={[
                ["estados", "Estados"],
                ["municipios", "Municípios"],
              ]}
              escolhida={nivel}
              aoEscolher={setNivel}
            />
          )}
          <MapaDoCartao
            chave={lugarDaTabela === "BR" ? (nivel === "estados" ? "ufs" : "municipios") : lugarDaTabela}
            arquivo={arquivo}
            quadro={quadro}
            base={base}
            modo={modo}
            aoEscolherModo={setModo}
            destaque={atual}
            rotulo={titulo}
          />
        </>
      )}
    </section>
  );
}

/** Um controle de duas opções, com o estado no `aria-pressed`, como o da base da projeção. */
function Alternancia<T extends string>({
  rotulo,
  opcoes,
  escolhida,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: [T, string][];
  escolhida: T;
  aoEscolher: (o: T) => void;
}) {
  return (
    <div class="alternancia" role="group" aria-label={rotulo}>
      {opcoes.map(([valor, texto]) => (
        <button key={valor} type="button" data-opcao={valor} aria-pressed={valor === escolhida ? "true" : "false"} onClick={() => aoEscolher(valor)}>
          {texto}
        </button>
      ))}
    </div>
  );
}

/** O que o mapa de uma vista desenha: as feições, o contorno por cima e os lugares da tabela deles. */
interface Vista {
  feicoes: Feature[];
  contorno: MultiLineString | null;
  tabela: ArquivoDaTabelaDeLugares;
}

/**
 * A vista do mapa: `ufs` (o Brasil por estados), `municipios` (o Brasil por municípios, com as fronteiras das UFs e os
 * lugares das tabelas das 27 UFs) ou a sigla de uma UF (os municípios dela, com o contorno dela).
 */
async function baixarVista(chave: string, arquivo: ArquivoDaTabelaDeLugares): Promise<Vista> {
  if (chave === "ufs") {
    const ufs = await baixar<MalhaDasUfs>(caminhoDaMalha("ufs"));
    return { feicoes: feature(ufs, ufs.objects.ufs).features, contorno: null, tabela: arquivo };
  }
  if (chave === "municipios") {
    const daUf = arquivo.linhas.filter((l) => l.id !== "ZZ").map((l) => baixar<ArquivoDaTabelaDeLugares>(caminhoDaTabelaDeLugares(l.id)));
    const [municipios, ufs, tabelas] = await Promise.all([
      baixar<MalhaDosMunicipios>(caminhoDaMalha("municipios")),
      baixar<MalhaDasUfs>(caminhoDaMalha("ufs")),
      Promise.all(daUf),
    ]);
    return {
      feicoes: feature(municipios, municipios.objects.municipios).features,
      contorno: mesh(ufs, ufs.objects.ufs, (a, b) => a !== b),
      // O Brasil por municípios não tem tabela de projeções: o modo de mudança fica para o fim da noite.
      tabela: { ...arquivo, lugar: "municipios", linhas: tabelas.flatMap((t) => t.linhas) },
    };
  }
  const daUf = await baixar<MalhaDosMunicipios>(caminhoDaMalha(chave));
  return { feicoes: feature(daUf, daUf.objects.municipios).features, contorno: mesh(daUf, daUf.objects.municipios, (a, b) => a === b), tabela: arquivo };
}

/** O mapa de uma vista no quadro, com a escolha do modo quando a noite a oferece. */
function MapaDoCartao(props: {
  chave: string;
  arquivo: ArquivoDaTabelaDeLugares;
  quadro: QuadroAoVivo;
  base: IdDaBase;
  modo: ModoDoMapa;
  aoEscolherModo: (m: ModoDoMapa) => void;
  destaque?: string;
  rotulo: string;
}) {
  const { chave, arquivo, quadro, base, modo } = props;
  const [vista, setVista] = useState<{ chave: string; vista: Vista } | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let vivo = true;
    setFalhou(false);
    baixarVista(chave, arquivo).then(
      (v) => vivo && setVista({ chave, vista: v }),
      () => vivo && setFalhou(true),
    );
    return () => void (vivo = false);
  }, [chave, arquivo]);

  const atual = vista?.chave === chave ? vista.vista : null;
  const conteudo = useMemo(
    () => (atual ? mapaDosLugares({ tabela: tabelaDosLugares({ arquivo: atual.tabela, quadro, base }), quadro, modo }) : null),
    [atual, quadro, base, modo],
  );
  if (falhou) return <p class="nota">O mapa não carregou. A Tabela tem os mesmos números.</p>;
  if (!atual || !conteudo) return <p class="nota">Baixando o mapa…</p>;
  return (
    <>
      {conteudo.modos.length > 0 && (
        <Alternancia
          rotulo="O que o mapa mostra"
          opcoes={[
            ["placar", "Placar"],
            ["mudanca", "Mudança desde o 1º turno"],
          ]}
          escolhida={conteudo.mostra === "mudanca" ? "mudanca" : "placar"}
          aoEscolher={props.aoEscolherModo}
        />
      )}
      <MapaDosLugares feicoes={atual.feicoes} contorno={atual.contorno} conteudo={conteudo} destaque={props.destaque} rotulo={`Mapa: ${props.rotulo}`} />
      <p class="fonte">Cálculo do Apurador com dados do TSE</p>
    </>
  );
}
