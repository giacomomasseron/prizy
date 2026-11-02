<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>@yield('title') · Prizy</title>
<!--[if mso]><style>table,td,a,span,p{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
<style>
  @media (max-width:620px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:30px!important;line-height:36px!important}
  }
  a{color:#1d1a14}
</style>
</head>
<body style="margin:0;padding:0;background-color:#fbf6ea;-webkit-text-size-adjust:100%;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">@yield('preheader')&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbf6ea" style="background-color:#fbf6ea;">
<tr><td align="center" style="padding:36px 12px 40px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

    <!-- Logo -->
    <tr><td align="center" style="padding:0 0 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="34" height="34" align="center" valign="middle" bgcolor="#1d1a14" style="width:34px;height:34px;background-color:#1d1a14;border-radius:10px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:18px;line-height:34px;font-weight:900;color:#ffd84a;mso-line-height-rule:exactly;">P</td>
        <td style="padding-left:10px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:24px;line-height:34px;font-weight:900;color:#1d1a14;letter-spacing:-0.5px;mso-line-height-rule:exactly;">Prizy</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:2px solid #1d1a14;border-right-width:7px;border-bottom-width:7px;border-radius:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr><td class="px" style="padding:40px 44px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#f4ecd8" style="background-color:#f4ecd8;border:1.5px solid #d3c6a6;border-radius:999px;padding:5px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:bold;color:#4f493d;letter-spacing:0.6px;text-transform:uppercase;mso-line-height-rule:exactly;">@yield('badge')</td>
          </tr></table>
        </td></tr>

        <tr><td class="px h1" style="padding:20px 44px 0;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:36px;line-height:42px;font-weight:900;color:#1d1a14;letter-spacing:-1px;mso-line-height-rule:exactly;">
          @yield('headline')
        </td></tr>

        <tr><td class="px" style="padding:18px 44px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:27px;color:#4f493d;word-break:break-word;overflow-wrap:anywhere;mso-line-height-rule:exactly;">
          @yield('intro')
        </td></tr>


        <!-- Workspace -->
        <tr><td class="px" style="padding:24px 44px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbf6ea" style="background-color:#fbf6ea;border:1.5px solid #1d1a14;border-radius:18px;">
            <tr>
              <td width="48" valign="middle" style="padding:16px 0 16px 18px;width:48px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="44" height="44" align="center" valign="middle" bgcolor="#ffd84a" style="width:44px;height:44px;background-color:#ffd84a;border:1.5px solid #1d1a14;border-radius:12px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:20px;line-height:44px;font-weight:900;color:#1d1a14;mso-line-height-rule:exactly;">{{ $workspaceInitial }}</td></tr></table>
              </td>
              <td valign="middle" style="padding:16px 18px 16px 14px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:bold;color:#6e6656;letter-spacing:0.6px;text-transform:uppercase;mso-line-height-rule:exactly;">Your workspace</div>
                <div style="padding-top:3px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:19px;line-height:24px;font-weight:900;color:#1d1a14;word-break:break-word;overflow-wrap:anywhere;mso-line-height-rule:exactly;">{{ $workspaceName }}</div>
                <div style="padding-top:2px;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:20px;mso-line-height-rule:exactly;"><a href="{{ $workspaceUrl }}" target="_blank" style="color:#4f493d;text-decoration:underline;">{{ $workspaceHost }}</a></div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Button -->
        <tr><td class="px" style="padding:30px 44px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ $actionUrl }}" style="height:56px;v-text-anchor:middle;width:240px;" arcsize="30%" strokecolor="#1d1a14" strokeweight="2px" fillcolor="#ffd84a"><center style="color:#1d1a14;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">{{ $actionText }} &rarr;</center></v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#ffd84a" style="background-color:#ffd84a;border:2px solid #1d1a14;border-right-width:5px;border-bottom-width:5px;border-radius:16px;">
              <a href="{{ $actionUrl }}" target="_blank" style="display:block;padding:16px 30px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:20px;font-weight:bold;color:#1d1a14;text-decoration:none;mso-line-height-rule:exactly;">{{ $actionText }} &rarr;</a>
            </td>
          </tr></table>
          <!--<![endif]-->
        </td></tr>

        <tr><td class="px" style="padding:16px 44px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#6e6656;mso-line-height-rule:exactly;">
          &#9203;&nbsp; @yield('expiring') expires in <strong style="color:#1d1a14;">{{ $expiresInHours }} hours</strong>.
        </td></tr>

        <!-- Next steps -->
        <tr><td class="px" style="padding:36px 44px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbf6ea" style="background-color:#fbf6ea;border:1.5px solid #e6dcc4;border-radius:18px;">
            <tr><td style="padding:22px 24px 6px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:900;color:#1d1a14;mso-line-height-rule:exactly;">@yield('steps-heading')</td></tr>
            <tr><td style="padding:8px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                @foreach ($steps as $step)
                <tr>
                  <td width="30" valign="top" style="padding:0 0 {{ $loop->last ? 18 : 12 }}px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="22" height="22" align="center" bgcolor="#1d1a14" style="width:22px;height:22px;background-color:#1d1a14;border-radius:11px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:22px;font-weight:bold;color:#ffd84a;mso-line-height-rule:exactly;">{{ $loop->iteration }}</td></tr></table></td>
                  <td valign="top" style="padding:1px 0 {{ $loop->last ? 18 : 12 }}px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#4f493d;mso-line-height-rule:exactly;"><strong style="color:#1d1a14;">{{ $step['title'] }}</strong>{{ $step['rest'] }}</td>
                </tr>
                @endforeach
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="px" style="padding:30px 44px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#4f493d;mso-line-height-rule:exactly;">
          @if ($onPrizyCloud)
          See you inside,<br><strong style="color:#1d1a14;">The Prizy team</strong>
          @else
          See you inside.
          @endif
        </td></tr>

        <!-- Fallback -->
        <tr><td class="px" style="padding:30px 44px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-top:1.5px dashed #d3c6a6;padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#6e6656;mso-line-height-rule:exactly;">
              Button not working? Paste this link into your browser:
            </td></tr>
            <tr><td style="padding-top:10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="#f4ecd8" style="background-color:#f4ecd8;border-radius:10px;padding:12px 14px;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:18px;word-break:break-all;mso-line-height-rule:exactly;">
                  <a href="{{ $actionUrl }}" target="_blank" style="color:#4f493d;text-decoration:underline;">{{ $actionUrl }}</a>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding:28px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6e6656;mso-line-height-rule:exactly;">
      @yield('disclaimer')
    </td></tr>
    <tr><td align="center" style="padding:10px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6e6656;mso-line-height-rule:exactly;">
      @if ($onPrizyCloud)
      &copy; {{ date('Y') }} Prizy &middot; <a href="https://prizy.dev" style="color:#6e6656;text-decoration:underline;">prizy.dev</a> &middot; <a href="https://docs.prizy.dev" style="color:#6e6656;text-decoration:underline;">Help</a>
      @else
      Sent from <a href="{{ $workspaceUrl }}" style="color:#6e6656;text-decoration:underline;">{{ $workspaceHost }}</a>
      @endif
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
