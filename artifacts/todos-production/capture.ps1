param(
    [int]$Port = 9229,
    [int]$Width = 1280,
    [int]$Height = 720,
    [string]$Url = 'http://localhost:8081/todos',
    [string]$Theme = 'japanese',
    [string]$Wallpaper = 'sky',
    [string]$Pet = 'meka-sakiko',
    [int]$OpenCard = 0,
    [switch]$OpenWithKeyboard,
    [switch]$OpenCompleted,
    [switch]$CloseWithEscape,
    [int]$RepeatCards = 0,
    [switch]$LongText,
    [switch]$SubmitSearch,
    [string]$SearchKeyword = '',
    [string]$SearchCategory = '',
    [string]$SortOrder = '',
    [string]$Output
)

$page = (Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json").Where({ $_.type -eq 'page' })[0]
if (-not $page) { throw 'Todo page was not found in Edge.' }
$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$socket.ConnectAsync([Uri]$page.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:failures = @()

function Send-Cdp {
    param([int]$Id, [string]$Method, [object]$Params)
    $payload = @{id=$Id;method=$Method;params=$Params} | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    $buffer = [byte[]]::new(4194304)
    while ($true) {
        $stream = [IO.MemoryStream]::new()
        do {
            $received = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
            $stream.Write($buffer, 0, $received.Count)
        } until ($received.EndOfMessage)
        $message = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        if ($message.method -eq 'Network.responseReceived' -and $message.params.response.status -ge 400) {
            $script:failures += "HTTP $($message.params.response.status) $($message.params.response.url)"
        }
        if ($message.method -eq 'Log.entryAdded' -and $message.params.entry.level -eq 'error') {
            $script:failures += "Console $($message.params.entry.text)"
        }
        if ($message.id -eq $Id) {
            if ($message.error) { throw ($message.error | ConvertTo-Json -Compress) }
            return $message.result
        }
    }
}

try {
    Send-Cdp 1 'Emulation.setDeviceMetricsOverride' @{width=$Width;height=$Height;deviceScaleFactor=1;mobile=($Width -lt 761)} | Out-Null
    Send-Cdp 2 'Page.enable' @{} | Out-Null
    Send-Cdp 3 'Network.enable' @{} | Out-Null
    Send-Cdp 31 'Network.setCacheDisabled' @{cacheDisabled=$true} | Out-Null
    Send-Cdp 4 'Log.enable' @{} | Out-Null
    Send-Cdp 5 'Runtime.enable' @{} | Out-Null
    $origin = ([Uri]$Url).GetLeftPart('Authority')
    Send-Cdp 6 'Page.navigate' @{url=($origin + '/todos')} | Out-Null
    Start-Sleep -Milliseconds 400
    $settings = @{board=$Theme;wallpaper=$Wallpaper;pet=$Pet} | ConvertTo-Json -Compress
    Send-Cdp 7 'Runtime.evaluate' @{expression="localStorage.setItem('todo-appearance-v1', '$settings')";returnByValue=$true} | Out-Null
    Send-Cdp 8 'Page.navigate' @{url=$Url} | Out-Null
    Start-Sleep -Milliseconds 650
    if ($RepeatCards -gt 0) {
        $repeat = 'const grid=document.querySelector(".notice-grid");const originals=[...grid.children];for(let i=0;i<' + $RepeatCards + ';i++)grid.append(originals[i%originals.length].cloneNode(true));'
        Send-Cdp 80 'Runtime.evaluate' @{expression=$repeat;returnByValue=$true} | Out-Null
    }
    if ($LongText) {
        $long = 'const card=document.querySelector(".notice-thumb");card.dataset.title="長いタイトル".repeat(35);card.dataset.memo="長いメモと詳細。".repeat(150);card.querySelector(".notice-thumb__title").textContent=card.dataset.title;'
        Send-Cdp 81 'Runtime.evaluate' @{expression=$long;returnByValue=$true} | Out-Null
    }
    if ($SubmitSearch) {
        $keywordJson = ConvertTo-Json -InputObject $SearchKeyword -Compress
        $categoryJson = ConvertTo-Json -InputObject $SearchCategory -Compress
        $search = 'document.querySelector("#board-keyword").value=' + $keywordJson + ';document.querySelector("#board-category").value=' + $categoryJson + ';document.querySelector(".preview-controls__search button").click();'
        Send-Cdp 82 'Runtime.evaluate' @{expression=$search;returnByValue=$true} | Out-Null
        Start-Sleep -Milliseconds 650
    }
    if ($SortOrder) {
        if ($SortOrder -notin @('asc', 'desc')) { throw 'SortOrder must be asc or desc.' }
        $sortIndex = if ($SortOrder -eq 'asc') { 0 } else { 1 }
        $sortScript = 'document.querySelectorAll(".preview-controls__sort-buttons a")[' + $sortIndex + '].click()'
        Send-Cdp 83 'Runtime.evaluate' @{expression=$sortScript;returnByValue=$true} | Out-Null
        Start-Sleep -Milliseconds 650
    }
    if ($OpenWithKeyboard) {
        Send-Cdp 84 'Runtime.evaluate' @{expression='document.querySelector(".notice-thumb").focus()';returnByValue=$true} | Out-Null
        Send-Cdp 85 'Input.dispatchKeyEvent' @{type='rawKeyDown';key='Enter';code='Enter';windowsVirtualKeyCode=13;nativeVirtualKeyCode=13} | Out-Null
        Send-Cdp 851 'Input.dispatchKeyEvent' @{type='char';key='Enter';code='Enter';text="`r";windowsVirtualKeyCode=13} | Out-Null
        Send-Cdp 86 'Input.dispatchKeyEvent' @{type='keyUp';key='Enter';code='Enter';windowsVirtualKeyCode=13;nativeVirtualKeyCode=13} | Out-Null
    } elseif ($OpenCompleted) {
        Send-Cdp 8 'Runtime.evaluate' @{expression='document.querySelector(".notice-thumb[data-status=\"完了\"]")?.click()';returnByValue=$true} | Out-Null
    } elseif ($OpenCard -gt 0) {
        $index = $OpenCard - 1
        Send-Cdp 8 'Runtime.evaluate' @{expression="document.querySelectorAll('.notice-thumb')[$index]?.click()";returnByValue=$true} | Out-Null
    }
    if ($CloseWithEscape) {
        Send-Cdp 9 'Input.dispatchKeyEvent' @{type='keyDown';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
        Send-Cdp 10 'Input.dispatchKeyEvent' @{type='keyUp';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    }
    $expression = 'JSON.stringify({url:location.href,viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],theme:document.documentElement.dataset.board,wallpaper:document.documentElement.dataset.wallpaper,petSetting:document.documentElement.dataset.pet,boardDisplay:getComputedStyle(document.querySelector(".todo-board-layout")).display,plainDisplay:getComputedStyle(document.querySelector(".plain-todos")).display,cardCount:document.querySelectorAll(".notice-thumb").length,completedCount:document.querySelectorAll(".notice-thumb[data-status=\"完了\"]").length,doneStamps:document.querySelectorAll(".notice-thumb__stamp--done").length,emptyText:document.querySelector(".board__empty")?.textContent??null,searchKeyword:document.querySelector("#board-keyword").value,searchCategory:document.querySelector("#board-category").value,firstDue:document.querySelector(".notice-thumb")?.dataset.due??null,toolbar:document.querySelector(".preview-controls").getBoundingClientRect().toJSON(),paper:document.querySelector(".board__paper").getBoundingClientRect().toJSON(),paperScrollHeight:document.querySelector(".board__paper").scrollHeight,gridColumns:document.querySelector(".notice-grid")?getComputedStyle(document.querySelector(".notice-grid")).gridTemplateColumns:null,brokenImages:[...document.images].filter(i=>i.getAttribute("src")&&(!i.complete||!i.naturalWidth)).map(i=>i.src),dialogOpen:document.querySelector("#notice-dialog").open,focused:document.activeElement?.className??null,dialogRect:document.querySelector("#notice-dialog").open?document.querySelector("#notice-dialog").getBoundingClientRect().toJSON():null,bodyRect:document.querySelector("#notice-dialog").open?document.querySelector(".notice-dialog__body").getBoundingClientRect().toJSON():null,detailRect:document.querySelector("#notice-dialog").open?document.querySelector(".notice-dialog__details").getBoundingClientRect().toJSON():null,actionsRect:document.querySelector("#notice-dialog").open?document.querySelector(".notice-dialog__actions").getBoundingClientRect().toJSON():null,detailMatches:document.querySelector("#notice-dialog").open?[...document.querySelectorAll(".notice-thumb")].some(c=>c.dataset.title===document.querySelector("#detail-title").textContent&&c.dataset.editUrl===document.querySelector("#detail-edit").getAttribute("href")):null,editUrl:document.querySelector("#notice-dialog").open?document.querySelector("#detail-edit").getAttribute("href"):null,deleteUrl:document.querySelector("#notice-dialog").open?document.querySelector("#detail-delete").getAttribute("href"):null,petVisible:getComputedStyle(document.querySelector(".idle-pet")).display!=="none"})'
    $metrics = Send-Cdp 11 'Runtime.evaluate' @{expression=$expression;returnByValue=$true}
    if ($metrics.exceptionDetails) { throw ($metrics.exceptionDetails | ConvertTo-Json -Depth 5 -Compress) }
    Write-Output $metrics.result.value
    if ($Output) {
        $shot = Send-Cdp 12 'Page.captureScreenshot' @{format='png';fromSurface=$true;captureBeyondViewport=$false}
        [IO.File]::WriteAllBytes($Output, [Convert]::FromBase64String($shot.data))
    }
    Write-Output ($script:failures | Sort-Object -Unique)
} finally {
    $socket.Dispose()
}


