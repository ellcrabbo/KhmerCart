/* eslint-disable @typescript-eslint/no-require-imports */

const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'";
const CODEGEN_MARKER =
  "['ReactCodegen', 'ReactAppDependencyProvider'].each do |pod_name|";
const HERMES_MARKER =
  "Pod::UI.puts '[Hermes] Restoring missing simulator xcframework slice from cached debug tarball'";
const EMBED_FRAMEWORKS_MARKER = "[CP] Embed Pods Frameworks";
const EMBED_PHASE_ID = "C0DE0001A6B11D0000000001";

function injectFmtFix(contents) {
  let updatedContents = contents;

  if (!updatedContents.includes("project 'KhmerCartMobile.xcodeproj'")) {
    updatedContents = updatedContents.replace(
      "prepare_react_native_project!\n",
      "prepare_react_native_project!\n\nproject 'KhmerCartMobile.xcodeproj'\n"
    );
  }

  if (
    updatedContents.includes(MARKER) &&
    updatedContents.includes(CODEGEN_MARKER) &&
    updatedContents.includes(HERMES_MARKER)
  ) {
    return updatedContents;
  }

  const targetBlock = [
    "    installer.pods_project.targets.each do |target|",
    "      if target.name == 'fmt'",
    "        target.build_configurations.each do |config|",
    `          ${MARKER}`,
    "        end",
    "      end",
    "    end",
    "",
    "    ['ReactCodegen', 'ReactAppDependencyProvider'].each do |pod_name|",
    "      support_dir = File.join(installer.sandbox.root, 'Target Support Files', pod_name)",
    "      headers_dir = File.join(installer.sandbox.root, 'Headers', 'Public', pod_name)",
    "      modulemap_path = File.join(support_dir, \"#{pod_name}.modulemap\")",
    "      umbrella_path = File.join(support_dir, \"#{pod_name}-umbrella.h\")",
    "      next unless Dir.exist?(headers_dir)",
    "",
    "      unless File.exist?(modulemap_path)",
    "        File.write(modulemap_path, <<~MODULEMAP)",
    "          module #{pod_name} {",
    "            umbrella header \"#{pod_name}-umbrella.h\"",
    "",
    "            export *",
    "            module * { export * }",
    "          }",
    "        MODULEMAP",
    "      end",
    "",
    "      unless File.exist?(umbrella_path)",
    "        public_headers = Dir.children(headers_dir)",
    "          .select { |name| name.end_with?('.h') && !name.end_with?('-umbrella.h') }",
    "          .sort",
    "",
    "        umbrella_contents = [",
    "          '#ifdef __OBJC__',",
    "          '#import <UIKit/UIKit.h>',",
    "          '#else',",
    "          '#ifndef FOUNDATION_EXPORT',",
    "          '#if defined(__cplusplus)',",
    "          '#define FOUNDATION_EXPORT extern \"C\"',",
    "          '#else',",
    "          '#define FOUNDATION_EXPORT extern',",
    "          '#endif',",
    "          '#endif',",
    "          '#endif',",
    "          ''",
    "        ]",
    "",
    "        public_headers.each do |header|",
    "          umbrella_contents << %(#import \"#{header}\")",
    "        end",
    "",
    "        umbrella_contents += [",
    "          '',",
    "          \"FOUNDATION_EXPORT double #{pod_name}VersionNumber;\",",
    "          \"FOUNDATION_EXPORT const unsigned char #{pod_name}VersionString[];\",",
    "          ''",
    "        ]",
    "",
    "        File.write(umbrella_path, umbrella_contents.join(\"\\n\"))",
    "      end",
    "    end",
    "",
    "    hermes_root = File.join(installer.sandbox.root, 'hermes-engine')",
    "    hermes_xcframework_dir = File.join(hermes_root, 'destroot', 'Library', 'Frameworks', 'universal', 'hermes.xcframework')",
    "    hermes_simulator_slice = File.join(hermes_xcframework_dir, 'ios-arm64_x86_64-simulator')",
    "    hermes_debug_tarball = Dir[File.join(installer.sandbox.root, 'hermes-engine-artifacts', 'hermes-ios-*-debug.tar.gz')].first",
    "",
    "    if hermes_debug_tarball && !Dir.exist?(hermes_simulator_slice)",
    "      Pod::UI.puts '[Hermes] Restoring missing simulator xcframework slice from cached debug tarball'",
    "      Pod::Executable.execute_command('tar', ['-xf', hermes_debug_tarball, '-C', hermes_root])",
    "    end"
  ].join("\n");

  if (!updatedContents.includes("post_install do |installer|")) {
    throw new Error("Unable to find post_install block in iOS Podfile.");
  }

  return updatedContents.replace(
    /(\s*react_native_post_install\([\s\S]*?\)\n\s*)/,
    `$1${targetBlock}\n`
  );
}

function injectEmbedPodsFrameworks(contents) {
  if (contents.includes(EMBED_FRAMEWORKS_MARKER)) {
    return contents;
  }

  const buildPhaseEntry =
    `\t\t\t\t${EMBED_PHASE_ID} /* ${EMBED_FRAMEWORKS_MARKER} */,\n`;
  const buildPhaseAnchor =
    /\t\t\t\t800E24972A6A228C8D4807E9 \/\* \[CP\] Copy Pods Resources \*\/,\n/;

  if (!buildPhaseAnchor.test(contents)) {
    throw new Error("Unable to find Copy Pods Resources build phase in Xcode project.");
  }

  const shellPhaseBlock = [
    `\t\t${EMBED_PHASE_ID} /* ${EMBED_FRAMEWORKS_MARKER} */ = {`,
    "\t\t\tisa = PBXShellScriptBuildPhase;",
    "\t\t\tbuildActionMask = 2147483647;",
    "\t\t\tfiles = (",
    "\t\t\t);",
    "\t\t\tinputPaths = (",
    '\t\t\t\t"${PODS_ROOT}/Target Support Files/Pods-KhmerCartMobile/Pods-KhmerCartMobile-frameworks.sh",',
    '\t\t\t\t"${PODS_XCFRAMEWORKS_BUILD_DIR}/hermes-engine/Pre-built/hermes.framework",',
    "\t\t\t);",
    `\t\t\tname = "${EMBED_FRAMEWORKS_MARKER}";`,
    "\t\t\toutputPaths = (",
    '\t\t\t\t"${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}/hermes.framework",',
    "\t\t\t);",
    "\t\t\trunOnlyForDeploymentPostprocessing = 0;",
    "\t\t\tshellPath = /bin/sh;",
    '\t\t\tshellScript = "\\"${PODS_ROOT}/Target Support Files/Pods-KhmerCartMobile/Pods-KhmerCartMobile-frameworks.sh\\"\\n";',
    "\t\t\tshowEnvVarsInLog = 0;",
    "\t\t};"
  ].join("\n");

  const withBuildPhaseEntry = contents.replace(
    buildPhaseAnchor,
    (match) => `${match}${buildPhaseEntry}`
  );

  return withBuildPhaseEntry.replace(
    "/* End PBXShellScriptBuildPhase section */",
    `${shellPhaseBlock}\n/* End PBXShellScriptBuildPhase section */`
  );
}

module.exports = function withFmtCxx17(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      const original = fs.readFileSync(podfilePath, "utf8");
      const updated = injectFmtFix(original);

      if (updated !== original) {
        fs.writeFileSync(podfilePath, updated);
      }

      const projectPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "KhmerCartMobile.xcodeproj",
        "project.pbxproj"
      );
      if (fs.existsSync(projectPath)) {
        const projectOriginal = fs.readFileSync(projectPath, "utf8");
        const projectUpdated = injectEmbedPodsFrameworks(projectOriginal);

        if (projectUpdated !== projectOriginal) {
          fs.writeFileSync(projectPath, projectUpdated);
        }
      }

      return modConfig;
    }
  ]);
};
