# ✨ Mirio — Whiteboard Colaborativo em Tempo Real

**Mirio** é uma plataforma de whiteboard colaborativo estilo Miro criada para equipes pensarem, desenharem e colaborarem em tempo real. Desenvolvido com **React + Vite + TypeScript**, **Konva.js**, **Tailwind CSS** e **Firebase** (Cloud Firestore + Realtime Database).

---

## 🚀 Funcionalidades

- **🎨 Whiteboard Interativo & Infinito**:
  - **Post-its (Sticky Notes)**: Notas adesivas nas cores clássicas do Miro com edição rápida de texto com duplo clique.
  - **Formas Geométricas**: Retângulos e Círculos com redimensionamento e rotação.
  - **Setas & Conectores**: Setas direcionais para fluxogramas e diagramação.
  - **Desenho Livre (Caneta)**: Traço fluído com suavização de curva.
  - **Caixas de Texto**: Inserção de texto livre no canvas.
  - **Manipulação & Transformação**: Mover, redimensionar e girar elementos via Konva Transformer.
  - **Pan & Zoom**: Navegação fluída com a roda do mouse e botão de mão/espaço para arrastar a lousa.
  - **Atalhos**: `Delete` / `Backspace` para apagar elementos, atalhos de ferramentas (`V`, `N`, `R`, `O`, `A`, `P`, `T`, `H`).

- **⚡ Colaboração em Tempo Real (Firebase Híbrido)**:
  - **Cursores ao Vivo (RTDB)**: Acompanhe os ponteiros do mouse de cada membro voando na tela em tempo real com nome e cor personalizada.
  - **Presença Instantânea**: Lista de avatares no topo mostrando quem está no quadro no momento.
  - **Destaque de Seleção Compartilhada**: Quando um colega seleciona ou move um post-it/forma, uma borda com a cor e o nome dele aparece para toda a equipe.
  - **Persistência Confiável (Firestore)**: Cada elemento possui ID próprio, evitando conflitos de sobrescrita acidental.

- **🔒 Autenticação & Compartilhamento**:
  - **Google Sign-In**: Login com um clique para contas Google.
  - **Acesso Anônimo (Guest)**: Colegas que receberem o link podem entrar instantaneamente digitando apenas seu nome.
  - **Dashboard de Quadros**: Gerencie múltiplos quadros, renomeie, exclua ou copie links diretos.

---

## 🛠️ Como Executar o Projeto

### 1. Clonar e Instalar Dependências

```bash
git clone https://github.com/seu-usuario/mirio.git
cd mirio
npm install
```

### 2. Configurar o Firebase

Crie um projeto no [Console do Firebase](https://console.firebase.google.com/) e ative os seguintes serviços:

1. **Authentication**:
   - Vá em **Authentication** -> **Sign-in method**.
   - Ative o provedor **Google**.
   - Ative o provedor **Anônimo (Anonymous)**.

2. **Cloud Firestore**:
   - Vá em **Firestore Database** -> **Criar banco de dados**.
   - Inicie no modo de teste ou configure as regras:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /boards/{boardId} {
           allow read, write: if request.auth != null;
           match /elements/{elementId} {
             allow read, write: if request.auth != null;
           }
         }
       }
     }
     ```

3. **Realtime Database (RTDB)**:
   - Vá em **Realtime Database** -> **Criar banco de dados**.
   - Configure as regras de leitura e escrita:
     ```json
     {
       "rules": {
         "presence": {
           "$boardId": {
             ".read": "auth != null",
             "$userId": {
               ".write": "auth != null && auth.uid == $userId"
             }
           }
         }
       }
     }
     ```

4. **Copie as Chaves para o `.env`**:
   Copie o arquivo `.env.example` para `.env` e preencha suas variáveis:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=seu-projeto
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

*(Nota: Enquanto você não configurar o Firebase, o Mirio funciona em modo local/demonstração com sincronização entre abas do mesmo navegador para você testar imediatamente!)*

### 3. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse em seu navegador: `http://localhost:5173`

---

## ⌨️ Atalhos de Teclado no Canvas

| Tecla | Ação |
|---|---|
| `V` | Ferramenta Selecionar / Mover |
| `H` ou `Barra de Espaço` (segurar) | Mover a Tela (Pan) |
| `N` | Criar Post-it (Sticky Note) |
| `R` | Criar Retângulo |
| `O` | Criar Círculo |
| `A` | Criar Seta / Conector |
| `P` | Caneta (Desenho livre) |
| `T` | Inserir Caixa de Texto |
| `Delete` ou `Backspace` | Excluir elemento selecionado |
| `Scroll do Mouse` | Zoom in / Zoom out |
| `Duplo Clique` | Editar texto de Post-it ou Caixa de Texto |

---

## 📦 Estrutura de Código

```
mirio/
├── src/
│   ├── config/
│   │   └── firebase.ts           # Inicialização e detecção do Firebase
│   ├── context/
│   │   └── AuthContext.tsx       # Provedor de autenticação (Google e Guest)
│   ├── types/
│   │   ├── board.ts              # Modelos de quadro, presença e usuário
│   │   └── element.ts            # Tipos e ferramentas de elementos do canvas
│   ├── services/
│   │   ├── boardService.ts       # Operações CRUD de quadros
│   │   ├── elementService.ts     # Sincronização de elementos no Firestore
│   │   └── presenceService.ts    # Transmissão de cursores e presença no RTDB
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.tsx        # Barra superior com título e avatares
│   │   └── whiteboard/
│   │       ├── WhiteboardCanvas.tsx # Canvas principal Konva com eventos
│   │       ├── Toolbar.tsx          # Barra de ferramentas flutuante
│   │       ├── RemoteCursors.tsx    # Renderização dos cursores dos colegas
│   │       ├── StickyNoteItem.tsx   # Post-its coloridos
│   │       ├── ShapeItem.tsx        # Retângulos e círculos
│   │       ├── ArrowItem.tsx        # Setas e linhas
│   │       ├── FreeDrawItem.tsx     # Traço de caneta
│   │       └── TextItem.tsx         # Caixas de texto
│   └── pages/
│       ├── LoginPage.tsx         # Login com Google e entrada de convidado
│       ├── DashboardPage.tsx     # Listagem de quadros da equipe
│       └── BoardPage.tsx         # Lousa colaborativa
```
