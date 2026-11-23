# StackQuest

[Abrir a trilha avançada](https://marcusnog.github.io/stackquest/#avancado)

As 15 missões avançadas cobrem sistemas distribuídos sob falha, arquitetura de LLMs, RAG, fine-tuning e avaliação em produção. Duas missões incluem experimentos no navegador com recuperação de trechos e treino de um adaptador em um classificador pequeno.

Trilha de System Design em português com missões, simuladores de infraestrutura e seis estudos práticos sobre bancos de dados.

[Acessar laboratório de dados](https://marcusnog.github.io/stackquest/#lab/bancos) · [Saúde da API](https://stackquest.157.254.207.208.nip.io/api/health)

## Arquitetura

O frontend estático em `dist/` roda no GitHub Pages. A API Node em `backend/` executa os experimentos de dados no K3s da VPS. O aluno pode criar uma conta com usuário e senha. O progresso autenticado, incluindo decisões, anotações e arquivos dos laboratórios, fica no SQLite de um volume persistente. Cada registro pertence ao usuário da sessão e tem uma versão para detectar edições concorrentes. O modo visitante usa armazenamento local separado.

Os experimentos comparam operações lógicas em dados sintéticos. Por exemplo, o controle de estoque reproduz um entrelaçamento de oito pedidos que observam a mesma unidade. Os contadores de leitura excluem a construção dos índices.

## Executar e testar

Com Node 24, rode `node --test test-accounts.cjs test-db.cjs test-labs.cjs`. Para iniciar a API, use `node backend/server.cjs` e consulte `http://localhost:8080/api/experimentos/checkout/async`. As variáveis `DATA_FILE`, `PORT` e `FRONTEND_ORIGIN` configuram o arquivo SQLite, a porta e a origem permitida no desenvolvimento.

## Publicação

A branch `main` contém as duas partes. O Pages publica a raiz da branch `gh-pages`, gerada de `dist/` com `git subtree split --prefix=dist`. O frontend usa a origem HTTPS da API definida em `dist/account.js`.

No K3s, os recursos ficam no namespace `stackquest`. Com o namespace criado, `k3s kubectl apply -k backend` aplica o serviço, a rota Traefik, o certificado gerenciado pelo cert-manager e a versão do código da API. Para acompanhar a implantação, use `k3s kubectl -n stackquest rollout status deployment/api`.
