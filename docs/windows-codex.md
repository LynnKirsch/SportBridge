# Windows / Codex environment

Практические правила для локальной разработки SportBridge в Windows и работы через Codex. Сначала определяется категория проблемы, затем используется уже подтверждённый способ запуска.

## Project environment

- OS: Windows.
- Shell: PowerShell.
- Project path: `D:\Project Next\Sportbridge` — путь содержит пробелы.
- Windows profile directory: `C:\Users\imast`.
- Actual Windows account: `LAPTOP-8KII1V3G\user`.

`imast` — имя каталога профиля, а не имя Windows account.

## Paths with spaces

Не использовать неэкранированный путь, например:

```powershell
cd D:\Project Next\Sportbridge
```

Предпочитать PowerShell-safe вариант:

```powershell
Set-Location -LiteralPath 'D:\Project Next\Sportbridge'
Get-ChildItem -LiteralPath 'D:\Project Next\Sportbridge'
```

Не собирать shell-команды конкатенацией неэкранированного project path со строкой команды.

## Start-Process and executable arguments

В этом окружении PowerShell `Start-Process` уже давал ошибки при сложных аргументах и путях с пробелами. Не объединять путь к executable и аргументы в одну строку.

```powershell
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$args = @(
  '--remote-debugging-port=9222'
  '--user-data-dir=C:\Temp\sportbridge-chrome'
  'http://localhost:3000'
)

Start-Process -FilePath $chrome -ArgumentList $args
```

Если отдельный процесс не нужен, использовать PowerShell call operator:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' @args
```

## Responsive and mobile screenshots

Изменение размера desktop-окна Chrome в Windows не доказывает viewport 375px или 390px: Chrome может сохранить минимальную ширину desktop-окна, а PNG будет лишь обрезан.

Для mobile responsive QA использовать Chrome DevTools Protocol и `Emulation.setDeviceMetricsOverride`. Перед сохранением screenshot фиксировать запрошенную CSS-width и фактический `window.innerWidth`; при расхождении screenshot не считается валидным доказательством.

Проверяемые ширины SportBridge: `375`, `390`, `480`, `640`, `960`, `1200`, `1440`, `1920`, `2560`.

## Codex sandbox / ACL

Ошибка `helper_unknown_error: setup refresh had errors` вместе с `SetNamedSecurityInfoW failed ... : 5` ранее означала проблему Windows Codex sandbox ACL/ownership, а не проблему приложения.

При повторении:

1. Прочитать свежий log в `C:\Users\imast\.codex\.sandbox\` и определить конкретную проблемную директорию.
2. Проверить owner этой директории. Ранее затрагивались `.codex` и `.git`; ошибочным owner мог быть `CodexSandboxOffline`.
3. Не менять приложение. Закрыть VS Code и использовать Administrator PowerShell только для подтверждённой затронутой директории.
4. Если log подтверждает неверного owner, применять targeted ownership fix, например:

```powershell
takeown /F "D:\Project Next\Sportbridge\.git" /R /D Y
takeown /F "D:\Project Next\Sportbridge\.codex" /R /D Y
```

После этого повторно проверить owner. Ожидаемый Windows account: `LAPTOP-8KII1V3G\user`; не назначать owner `imast`.

Sandbox-related DENY ACE сами по себе не означают повреждённый ACL. Не выполнять автоматически массовый `icacls /reset`, широкое рекурсивное изменение ACL или удаление DENY ACE. Сначала log, затем owner, затем только подтверждённое исправление.

## Next.js dev server and ports

`localhost:3000` не гарантирован. Перед browser QA прочитать фактический URL, который вывел `npm run dev`: если порт 3000 занят, Next.js может выбрать другой порт. В предыдущих проверках использовался и порт 3100.

Browser automation и screenshots должны обращаться к фактически запущенному URL.

## Long-running processes

Не объединять в одну сложную PowerShell chain `npm run dev`, Prisma Studio, browser QA и migrations. Держать процессы раздельно:

```text
Process A: npm run dev
Process B: npx prisma studio
Process C: Chrome / browser QA
```

Перед зависимой проверкой убедиться, что нужный процесс действительно готов.

## Prisma Studio

Не хардкодить порт Prisma Studio. Использовать URL, который выводит `npx prisma studio`; ранее Studio запускалась, например, на `http://localhost:51212`.

Prisma Studio — только development tool и не должен публично экспонироваться.

## Verification commands

Для основных проверок избегать сложных PowerShell chains. Предпочтительный последовательный запуск:

```powershell
npm run prisma:generate
npm run typecheck
npm run lint
npm run prisma:validate
npm run build
```

Если проверка упала, остановиться и определить первоначальную причину до запуска следующих команд. Не маскировать ошибку продолжением цепочки. Обязательные проверки из `AGENTS.md` имеют приоритет.

## Screenshot artifacts

PNG для responsive/browser QA — временные QA artifacts, не application assets. Не помещать их в `src`, не коммитить без явного запроса и не использовать cropped desktop screenshot как доказательство mobile viewport.

Использовать временную директорию. После проверки временные изображения можно удалить, если они больше не нужны для текущего отчёта.

## When a command fails

1. Прочитать точную ошибку.
2. Определить категорию: application/code, PowerShell quoting/path, process launch, filesystem ACL/sandbox или browser/viewport limitation.
3. Не менять application code, если проблема относится к environment/tooling.
4. Проверить этот документ и сначала применить уже подтверждённый рабочий путь.
5. Не повторять один известный нерабочий подход с небольшими вариациями.
6. Если найдены новая воспроизводимая environment-проблема и подтверждённый workaround, указать их в итоговом отчёте, чтобы обновить этот документ.
