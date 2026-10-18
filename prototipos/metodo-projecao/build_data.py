"""PROTÓTIPO DESCARTÁVEL: prepara os dados do protótipo de método de projeção (2º turno de 2022).

Lê os arquivos oficiais do TSE já baixados e grava um único HTML com os dados embutidos.

Uso:
  python -I build_data.py <dvs_2022_BR_compacto.csv> <votsec_2022_2t.csv> \
      <votacao_candidato_munzona_2022_BR.csv> <template.html> <saida.html>

- dvs_2022_BR_compacto.csv: detalhe_votacao_secao 2022 (horário de 1ª totalização de cada seção).
- votsec_2022_2t.csv: uf;mun;zona;secao;votos 13;votos 22;válidos, 2º turno.
- votacao_candidato_munzona_2022_BR.csv: resultado por município e zona (usado só o 1º turno).
"""
import bisect
import csv
import datetime as dt
import json
import sys
from collections import defaultdict

dvs_path, votsec_path, munzona_path, tpl_path, out_path = sys.argv[1:6]

REG = {"N": "AC AM AP PA RO RR TO", "NE": "AL BA CE MA PB PE PI RN SE",
       "CO": "DF GO MS MT", "SE": "ES MG RJ SP", "S": "PR RS SC", "EX": "ZZ"}
REGIAO = {uf: r for r, ufs in REG.items() for uf in ufs.split()}
REGIOES = ["N", "NE", "CO", "SE", "S", "EX"]
NOME_UF = {"ZZ": "Exterior"}


def segundos(s):
    """'30/10/2022 18:36:47' -> segundos absolutos (para ordenar e mostrar a hora)."""
    if not s or len(s) < 19 or s[2] != "/":
        return None
    d = dt.date(int(s[6:10]), int(s[3:5]), int(s[0:2])).toordinal()
    return d * 86400 + int(s[11:13]) * 3600 + int(s[14:16]) * 60 + int(s[17:19])


def hora(seg):
    seg %= 86400
    return f"{seg // 3600:02d}:{seg % 3600 // 60:02d}:{seg % 60:02d}"


# --- detalhe por seção: horário e aptos, nos dois turnos ---
sec = {1: {}, 2: {}}
dup = {1: 0, 2: 0}
with open(dvs_path, encoding="latin1", newline="") as f:
    r = csv.reader(f, delimiter=";")
    ix = {c: i for i, c in enumerate(next(r))}
    for row in r:
        if row[ix["DS_CARGO"]] != "Presidente":
            continue
        t = int(row[ix["NR_TURNO"]])
        k = (row[ix["SG_UF"]], int(row[ix["CD_MUNICIPIO"]]), int(row[ix["NR_ZONA"]]), int(row[ix["NR_SECAO"]]))
        if k in sec[t]:
            dup[t] += 1
            continue
        sec[t][k] = (segundos(row[ix["DT_PRIM_TOT_PARCIAL_HOR_TSE"]]), int(row[ix["QT_APTOS"]]))
print("seções por turno:", {t: len(v) for t, v in sec.items()}, "duplicadas:", dup)

# --- votos por seção no 2º turno ---
votos = {}
sa = sb = 0
with open(votsec_path, newline="") as f:
    for uf, mun, zona, secao, a, b, v in csv.reader(f, delimiter=";"):
        votos[(uf, int(mun), int(zona), int(secao))] = (int(a), int(b))
        sa += int(a)
        sb += int(b)
print(f"2T 2022: coluna A = {sa:,} votos, coluna B = {sb:,} votos (Lula deve ser ~60,3 mi)")
assert sa > sb, "esperava a coluna A = Lula (13)"

# --- 1º turno por município ---
res1 = defaultdict(lambda: [0, 0, 0])  # Lula, Bolsonaro, outros válidos
with open(munzona_path, encoding="latin1", newline="") as f:
    r = csv.reader(f, delimiter=";")
    ix = {c: i for i, c in enumerate(next(r))}
    for row in r:
        if row[ix["NR_TURNO"]] != "1" or row[ix["DS_CARGO"]] != "Presidente":
            continue
        k = (row[ix["SG_UF"]], int(row[ix["CD_MUNICIPIO"]]))
        q = int(row[ix["QT_VOTOS_NOMINAIS_VALIDOS"]])
        nr = row[ix["NR_CANDIDATO"]]
        res1[k][0 if nr == "13" else 1 if nr == "22" else 2] += q
nomes = {}
with open(munzona_path, encoding="latin1", newline="") as f:
    r = csv.reader(f, delimiter=";")
    ix = {c: i for i, c in enumerate(next(r))}
    for row in r:
        nomes.setdefault((row[ix["SG_UF"]], int(row[ix["CD_MUNICIPIO"]])), row[ix["NM_MUNICIPIO"]].title())

# --- municípios (do 2º turno) ---
muns = sorted({(k[0], k[1]) for k in sec[2]})
ufs = sorted({m[0] for m in muns}, key=lambda u: (u == "ZZ", u))
ufi = {u: i for i, u in enumerate(ufs)}
mi = {m: i for i, m in enumerate(muns)}
n = len(muns)
S = [0] * n
A = [0] * n
aptos1 = [0] * n
for k, (t, ap) in sec[2].items():
    i = mi[(k[0], k[1])]
    S[i] += 1
    A[i] += ap
for k, (t, ap) in sec[1].items():
    i = mi.get((k[0], k[1]))
    if i is not None:
        aptos1[i] += ap
sem1 = [m for m in muns if m not in res1]
print("municípios:", n, "sem resultado do 1T:", len(sem1), sem1[:5])

# --- linha do tempo do 2º turno ---
N = len(sec[2])
chegadas = []
sem_voto = 0
for k, (t, ap) in sec[2].items():
    if t is None:
        continue
    v = votos.get(k)
    if v is None:
        sem_voto += 1
        v = (0, 0)
    chegadas.append((t, mi[(k[0], k[1])], ap, v[0], v[1]))
chegadas.sort()
print(f"seções com horário: {len(chegadas):,} de {N:,}; com horário e sem votos: {sem_voto}")

# virada real (última troca de liderança, por seção)
la = lb = 0
lider = None
viradas = []
for j, (t, m, ap, a, b) in enumerate(chegadas, 1):
    la += a
    lb += b
    cur = "L" if la > lb else "B"
    if lider and cur != lider and j > N // 100:
        viradas.append((100 * j / N, hora(t)))
    lider = cur
final = {"L": la, "B": lb}
print("viradas reais:", [(round(p, 2), h) for p, h in viradas])
print(f"final: Lula {100 * la / (la + lb):.3f}%")

# fotografias da apuração em pontos de % de seções totalizadas
grade = [0.1, 0.25, 0.5, 0.75] + list(range(1, 100)) + [99.5, 99.9]
cortes = sorted({min(len(chegadas), max(1, round(p / 100 * N))) for p in grade} | {len(chegadas)})
fotos = []
ini = 0
for c in cortes:
    delta = defaultdict(lambda: [0, 0, 0, 0])
    for t, m, ap, a, b in chegadas[ini:c]:
        d = delta[m]
        d[0] += 1
        d[1] += ap
        d[2] += a
        d[3] += b
    ev = []
    for m in sorted(delta):
        ev += [m, *delta[m]]
    fotos.append({"p": round(100 * c / N, 4), "hora": hora(chegadas[c - 1][0]), "ev": ev})
    ini = c

# perfil de chegada de cada município no 1º turno (por mil), em função do % nacional de seções
N1 = len(sec[1])
ordem1 = sorted((t, mi.get((k[0], k[1]))) for k, (t, ap) in sec[1].items() if t is not None)
ranks = defaultdict(list)
for j, (t, m) in enumerate(ordem1, 1):
    if m is not None:
        ranks[m].append(100 * j / N1)
Q = list(range(0, 101, 4))
perfil = []
for m in range(n):
    rk = ranks.get(m, [])
    tot = len(rk) or 1
    perfil += [round(1000 * bisect.bisect_right(rk, q) / tot) for q in Q]

dados = {
    "eleicao": "2º turno de 2022",
    "candidatos": ["Lula", "Bolsonaro"],
    "N": N,
    "ufs": ufs,
    "ufNome": [NOME_UF.get(u, u) for u in ufs],
    "ufRegiao": [REGIOES.index(REGIAO[u]) for u in ufs],
    "regioes": ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Exterior"],
    "mun": {
        "uf": [ufi[m[0]] for m in muns],
        "nome": [nomes.get(m, str(m[1])) for m in muns],
        "S": S,
        "A": A,
        "aptos1": aptos1,
        "L1": [res1[m][0] for m in muns],
        "B1": [res1[m][1] for m in muns],
        "O1": [res1[m][2] for m in muns],
    },
    "perfilQ": Q,
    "perfil1T": perfil,
    "fotos": fotos,
    "final": final,
    "viradas": [{"p": round(p, 2), "hora": h} for p, h in viradas],
}
js = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
with open(tpl_path, encoding="utf-8") as f:
    tpl = f.read()
assert "/*__DADOS__*/null" in tpl
with open(out_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(tpl.replace("/*__DADOS__*/null", js))
print(f"fotos: {len(fotos)}; dados: {len(js) / 1e6:.1f} MB -> {out_path}")
