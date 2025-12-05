// Modules (this requires kernel permissions!)
var fs = require("fs");
var path = require("path");
var child_process = require("node:child_process");

// Get arguments and current executable filename
var args = CatCore.processArguments;
var bin = CatCore.currentProcess.path.split(/\/|\\/).pop();

// Check that executable filename is matching one of the architectures
if (!["aarch64", "alpha", "arm", "avr", "cris", "hppa", "i386", "loongarch64", "m68k", "microblaze", "microblazeel", "mips", "mipsel", "mips64", "mips64el", "or1k", "ppc", "ppc64", "riscv32", "riscv64", "rx", "s390x", "sh4", "sh4eb", "sparc", "sparc64", "tricore", "x86_64", "xtensa", "xtensaeb"].map(type => `qemu-system-${type}.app`).includes(bin)) {
  throw `Invalid QEMU binary: ${bin}.`;
}
var type = bin.split("-")[2].split(".")[0];

// Change arguments
var args2 = [];
for (var argIndex = 0; argIndex < args.length; argIndex++) {
  var arg = args[argIndex];
  args2.push(arg);
  // Parse paths in arguments like -cdrom /data/test.iso
  if (["-fda", "-fdb", "-hda", "-hdb", "-hdc", "-hdd", "-cdrom", "-sd", "-bios", "-pflash", "-kernel", "-shim", "-initrd", "-dtb"].includes(arg)) {
    let fsPath = args[argIndex + 1];
    if (!await CatCore.FS.exists(fsPath)) {
      throw `${bin}: ${arg} ${fsPath}: Could not open '${fsPath}': File does not exist.`;
    }
    args2.push(`.\\fs${fsPath.split("/").join("\\")}`);
    argIndex++;
  }
  // Parse paths in -drive
  if (arg == "-drive") {
    var driveArgs = args[argIndex + 1];
    let fsPath = driveArgs.match(/(?:,|^)file=(.+?)(?:,|$)/);
    if (fsPath) {
      fsPath = fsPath[1];
      if (!await CatCore.FS.exists(fsPath)) {
        throw `${bin}: ${arg} ${fsPath}: Could not open '${fsPath}': File does not exist.`;
      }
      driveArgs = driveArgs.replace(fsPath, `.\\fs${fsPath.split("/").join("\\")}`);
      args2.push(driveArgs);
      argIndex++;
    }
  }
  // Remove graphical and VNC options
  if (arg == "-display" || arg == "-full-screen" || arg == "-vnc") {
    throw `${bin}: ${arg}: invalid option`;
  }
}
// Setup VNC websocket server on port :6280 if graphics is required
if (!args2.includes("-nographic")) {
  args2.push("-vnc", ":0,websocket=6280");
}

// Download icon into /data/qemu.png, if doesn't exist
if (!await CatCore.FS.exists("/data/qemu.png", true)) {
  try {
    await CatCore.FS.writeFile("/data/qemu.png", Buffer.from(await fetch("https://www.qemu.org/assets/favicons/favicon-32x32.png").then(res => res.arrayBuffer())));
  } catch {}
}

var opts = {
  "cwd": process.cwd()
};
if (process.platform == "darwin") {
  opts.cwd = path.join(process.cwd(), "..", "..", "..", "..");
}

// Start QEMU process on the host
var qemuProc = null;
if (process.platform == "win32") {
  qemuProc = child_process.spawn(`qemu-system-${type}w.exe`, args2, opts);
} else if (process.platform == "darwin") {
  // MacOS has issues with process.env.PATH, so the binary can't be found by itself
  // Instead, probe two most common paths for a normal homebrew install of QEMU
  // If both fail, at least try to launch and hope it's in process.env.PATH
  if (fs.existsSync(`/opt/homebrew/bin/qemu-system-${type}`)) {
    qemuProc = child_process.spawn(`/opt/homebrew/bin/qemu-system-${type}`, args2, opts);
  } else if (fs.existsSync(`/usr/local/bin/qemu-system-${type}`)) {
    qemuProc = child_process.spawn(`/usr/local/bin/qemu-system-${type}`, args2, opts);
  } else {
    qemuProc = child_process.spawn(`qemu-system-${type}`, args2, opts);
  }
} else {
  qemuProc = child_process.spawn(`qemu-system-${type}`, args2, opts);
}

qemuProc.stdout.on("data", console.log);
qemuProc.stderr.on("data", console.error);

// QEMU window if graphics is required
if (!args2.includes("-nographic")) {
  var win = new CatCore.Graphics.Window;
  win.icon("/data/qemu.png").title("QEMU").width(720).height(450).buttons([{
    "type": "MacOS",
    "color": "red",
    "leftClick": () => {
      // Close button clicked
      qemuProc.kill("SIGKILL");
      win.close();
      CatCore.currentProcess.stop();
    }
  }]).buttonsStyle("MacOS");

  var layer = new CatCore.Graphics.Layer;
  win.setUI(layer);

  // VNC client
  var vnc = new CatCore.Graphics.VNC;
  vnc.width("100%").height("100%").address("ws://localhost:6280");
  layer.add(vnc);

  win.open();
  // Close window if QEMU process exits
  qemuProc.on("exit", () => {
    win.close();
    CatCore.currentProcess.stop();
  });
}