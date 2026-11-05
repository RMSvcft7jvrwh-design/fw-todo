param(
    [int]$Port = 9228,
    [int]$Width,
    [int]$Height,
    [string]$Output,
    [int]$ScrollCard = 0,
    [int]$RepeatCards = 0,
    [int]$OpenCard = 0,
    [string]$CloseMethod = 'none',
    [switch]$CheckInteractions
)

$pages = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json"
$page = $pages.Where({ $_.type -eq 'page' -and $_.url -like '*todos-board-preview.html' })[0]
if (-not $page) { throw 'Preview page was not found in Edge.' }

$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$socket.ConnectAsync([Uri]$page.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:browserFailures = @()

function Send-Cdp {
    param([int]$Id, [string]$Method, [object]$Params)
    $payload = @{id=$Id;method=$Method;params=$Params} | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    $buffer = [byte[]]::new(2097152)
    while ($true) {
        $stream = [IO.MemoryStream]::new()
        do {
            $received = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
            $stream.Write($buffer, 0, $received.Count)
        } until ($received.EndOfMessage)
        $message = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        if ($message.method -eq 'Network.responseReceived' -and $message.params.response.status -ge 400) {
            $script:browserFailures += "HTTP $($message.params.response.status) $($message.params.response.url)"
        }
        if ($message.method -eq 'Log.entryAdded' -and $message.params.entry.level -eq 'error') {
            $script:browserFailures += "Console $($message.params.entry.text)"
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
    Send-Cdp 10 'Network.enable' @{} | Out-Null
    Send-Cdp 11 'Log.enable' @{} | Out-Null
    Send-Cdp 12 'Runtime.enable' @{} | Out-Null
    Send-Cdp 7 'Page.reload' @{ignoreCache=$true} | Out-Null
    Start-Sleep -Milliseconds 350
    if ($RepeatCards -gt 0) {
        $repeatExpression = "(() => { const g=document.querySelector('#notice-grid'); const originals=[...g.children]; for(let i=originals.length;i<$RepeatCards;i++) g.append(originals[i % originals.length].cloneNode(true)); return g.children.length; })()"
        Send-Cdp 14 'Runtime.evaluate' @{expression=$repeatExpression;returnByValue=$true} | Out-Null
    }
    if ($ScrollCard -gt 0) {
        $scrollExpression = "(() => { const p = document.querySelector('.board__paper'); const c = document.querySelectorAll('.notice-thumb')[$($ScrollCard - 1)]; p.scrollTop += c.getBoundingClientRect().top - p.getBoundingClientRect().top - 7; return p.scrollTop; })()"
        Send-Cdp 5 'Runtime.evaluate' @{expression=$scrollExpression;returnByValue=$true} | Out-Null
    }
    if ($OpenCard -gt 0) {
        $openExpression = "document.querySelectorAll('.notice-thumb')[$($OpenCard - 1)].click(); document.querySelector('#notice-dialog').open"
        Send-Cdp 6 'Runtime.evaluate' @{expression=$openExpression;returnByValue=$true} | Out-Null
    }
    if ($CloseMethod -eq 'esc') {
        Send-Cdp 8 'Input.dispatchKeyEvent' @{type='keyDown';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
        Send-Cdp 9 'Input.dispatchKeyEvent' @{type='keyUp';key='Escape';code='Escape';windowsVirtualKeyCode=27} | Out-Null
    } elseif ($CloseMethod -eq 'button') {
        Send-Cdp 8 'Runtime.evaluate' @{expression='document.querySelector("#notice-close").click()';returnByValue=$true} | Out-Null
    }
    $expression = 'JSON.stringify({viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,controls:document.querySelector(".preview-controls").getBoundingClientRect().toJSON(),paper:document.querySelector(".board__paper").getBoundingClientRect().toJSON(),paperScrollHeight:document.querySelector(".board__paper").scrollHeight,paperClientHeight:document.querySelector(".board__paper").clientHeight,gridColumns:getComputedStyle(document.querySelector(".notice-grid")).gridTemplateColumns,thumbCount:document.querySelectorAll(".notice-thumb").length,images:Array.from(document.querySelectorAll(".notice-thumb__image")).map(i=>i.complete&&i.naturalWidth>0),brokenImages:Array.from(document.images).filter(i=>i.src&&!i.hidden&&(!i.complete||i.naturalWidth===0)).map(i=>i.src),dialogOpen:document.querySelector("#notice-dialog").open,dialog:document.querySelector("#notice-dialog").open?document.querySelector("#notice-dialog").getBoundingClientRect().toJSON():null,actions:document.querySelector("#notice-dialog").open?document.querySelector(".notice-dialog__actions").getBoundingClientRect().toJSON():null})'
    $metrics = Send-Cdp 3 'Runtime.evaluate' @{expression=$expression;returnByValue=$true}
    $shot = Send-Cdp 4 'Page.captureScreenshot' @{format='png';fromSurface=$true;captureBeyondViewport=$false}
    [IO.File]::WriteAllBytes($Output, [Convert]::FromBase64String($shot.data))
    Write-Output $metrics.result.value
    $statusExpression = 'JSON.stringify({cards:Array.from(document.querySelectorAll(".notice-thumb")).map(c=>({status:c.dataset.status,label:c.getAttribute("aria-label"),paperLabel:c.querySelector(".notice-thumb__status")?.textContent??null,stamp:c.querySelector(".notice-thumb__stamp")?.getAttribute("src")??null})),paperStatusCount:document.querySelectorAll(".notice-thumb__status,#detail-paper-status").length,detailStatus:document.querySelector("#detail-status").textContent,detailStampVisible:!document.querySelector("#detail-stamp").hidden})'
    $status = Send-Cdp 13 'Runtime.evaluate' @{expression=$statusExpression;returnByValue=$true}
    if ($status.exceptionDetails) { throw ($status.exceptionDetails | ConvertTo-Json -Depth 5 -Compress) }
    Write-Output $status.result.value
    if ($CheckInteractions) {
        $interactionExpression = '(() => {const k=document.querySelector("#preview-keyword"), c=document.querySelector("#preview-category"), g=document.querySelector("#notice-grid"); k.value=g.querySelector(".notice-thumb").dataset.title; document.querySelector("#preview-search").click(); const keywordCount=document.querySelectorAll(".notice-thumb:not([hidden])").length; k.value=""; c.selectedIndex=1; c.dispatchEvent(new Event("change")); const categoryCount=document.querySelectorAll(".notice-thumb:not([hidden])").length; c.selectedIndex=0; c.dispatchEvent(new Event("change")); document.querySelector("[data-order=desc]").click(); const firstDue=g.firstElementChild.dataset.due; g.firstElementChild.click(); const opened=document.querySelector("#notice-dialog").open; const edit=document.querySelector(".notice-dialog__action--edit").getBoundingClientRect(); const del=document.querySelector(".notice-dialog__action--delete").getBoundingClientRect(); document.querySelector("#notice-close").click(); return JSON.stringify({keywordCount,categoryCount,firstDue,opened,closed:!document.querySelector("#notice-dialog").open,editVisible:edit.width>0&&edit.bottom<innerHeight,deleteVisible:del.width>0&&del.bottom<innerHeight});})()'
        $interactions = Send-Cdp 15 'Runtime.evaluate' @{expression=$interactionExpression;returnByValue=$true}
        if ($interactions.exceptionDetails) { throw ($interactions.exceptionDetails | ConvertTo-Json -Depth 5 -Compress) }
        Write-Output $interactions.result.value
    }
    Write-Output ($script:browserFailures | Sort-Object -Unique)
} finally {
    $socket.Dispose()
}
