; 安装期数据校验（electron-builder NSIS include，经 electron-builder.yml nsis.include 挂载）。
; 数据根固定在用户主目录 ~/.ordo：已存在 = 非首次安装（升级/重装），提示且绝不触碰既有数据；
; 不存在 = 全新安装，静默放行（应用首启在 ~/.ordo 完成初始化：建库/密钥/守护进程配置）。
; NSIS 无 $PROFILE 常量，用户主目录经 USERPROFILE 环境变量取。
!macro customInit
  ReadEnvStr $R0 "USERPROFILE"
  IfFileExists "$R0.ordo\*.*" 0 ordo_data_check_done
    DetailPrint "检测到既有数据目录 $R0.ordo（升级安装，数据保留）"
    MessageBox MB_ICONINFORMATION|MB_OK \
      "检测到已有 Ordo 数据目录：$\r$\n$\r$\n$R0.ordo$\r$\n$\r$\n本次为升级安装，现有数据库、配置与日志将全部保留。"
  ordo_data_check_done:
!macroend

; 卸载语义（ADR-015）：数据根 ~/.ordo 不在 NSIS「删除应用数据」管辖内（其只认 %APPDATA%），
; 卸载尾段显式询问——默认保留供下次安装复用，确认后才清除
!macro customUnInstall
  ReadEnvStr $R0 "USERPROFILE"
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "是否同时删除用户数据目录？$\r$\n$\r$\n$R0.ordo$\r$\n$\r$\n包含数据库、日志与配置。选「否」保留数据，下次安装可继续使用。" \
    IDYES ordo_uninstall_remove_data IDNO ordo_uninstall_keep_data
  ordo_uninstall_remove_data:
    DetailPrint "正在删除用户数据目录 $R0.ordo"
    RMDir /r "$R0.ordo"
    Goto ordo_uninstall_done
  ordo_uninstall_keep_data:
    DetailPrint "已保留用户数据目录 $R0.ordo"
  ordo_uninstall_done:
!macroend
