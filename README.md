📊 Sales Dashboard — Aplicação Full Stack Analítica

1. Descrição do Projeto

Este projeto consiste no desenvolvimento de uma aplicação web full stack com um dashboard analítico interativo, inspirado em ferramentas como o Power BI.
A aplicação permite analisar dados de vendas através de gráficos e indicadores, suportando a tomada de decisão baseada em dados.

⸻

2. Objetivo

O principal objetivo é:
•	Desenvolver uma aplicação Node.js + MySQL + React
•	Criar uma API REST para disponibilização de dados analíticos
•	Visualizar dados através de gráficos interativos
•	Aplicar conceitos de arquitetura full stack e análise de dados

⸻

3. Tecnologias Utilizadas

Backend
•	Node.js
•	Express.js
•	MySQL
•	mysql2
•	dotenv
•	nodemon

Frontend
•	React
•	Vite
•	Recharts
•	CSS (layout responsivo)

Base de Dados
•	MySQL Relacional
•	Modelo estrela (tabela facto + tabelas de dimensão)
4. Arquitetura do Sistema
   Frontend (React)
   ↓ fetch
   Backend (Node.js + Express)
   ↓ queries SQL
   Base de Dados (MySQL)
   O backend fornece uma API REST que agrega dados da base de dados e o frontend consome esses dados para visualização gráfica.

⸻

5. Modelo de Dados

Tabelas principais:
•	sales (tabela facto)
•	products
•	categories
•	regions
•	sellers

A tabela sales armazena as vendas e referencia as restantes tabelas através de chaves estrangeiras.

⸻

6. Funcionalidades do Dashboard
   •	📈 Vendas por Mês (gráfico de linha)
   •	📊 Vendas por Categoria (gráfico de barras)
   •	🍩 Vendas por Região (gráfico circular)
   •	🔢 KPIs (total de vendas, nº de vendas, ticket médio, unidades vendidas)
   •	🔍 Filtros dinâmicos por ano, região e categoria
   •	📤 Exportação de relatórios em CSV e PDF
   •	🌙 Tema escuro profissional e layout responsivo

⸻

7. Dados Utilizados

Os dados foram gerados automaticamente através de um script SQL, criando mais de 200 registos realistas, distribuídos ao longo do ano de 2024.

⸻

8. Uso de Inteligência Artificial

Ferramentas de IA foram utilizadas como assistente, nomeadamente para:
•	Apoiar a modelação do esquema da base de dados
•	Gerar dados fictícios realistas
•	Apoiar na estruturação do backend e frontend
•	Melhorar documentação e clareza do código

Todo o código foi revisto, compreendido e ajustado pelo aluno.

⸻

9. Execução do Projeto

Backend
cd backend
npm install
npm run dev

Frontend
cd frontend
npm install
npm run dev

	•	Backend: http://localhost:3006
	•	Frontend: http://localhost:5173

⸻

10. Limitações e Melhorias Futuras
    •	Autenticação de utilizadores
    •	Integração com dados reais


# sales-dashboard
# sales-dashboard
