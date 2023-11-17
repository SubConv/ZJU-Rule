#!/usr/bin/env python3

import os

IGNORE = (
    ("Clash", "config"),
    ("Clash", "Providers")
)
IGNORE = [ os.path.join(*_ignore) for _ignore in IGNORE ]

for root, dirs, files in os.walk("Clash"):
    dirs[:] = [d for d in dirs if os.path.join(root, d) not in IGNORE]
    for file in files:
        if file.endswith(".list"):
            print(os.path.join(root, file))
            path_l = os.path.join(root, file).split(os.sep)
            with open(os.path.join(root, file), encoding="utf-8") as f_in:
                lines = f_in.readlines()
                write_path = os.path.join(*path_l[:1], "Providers", *path_l[1:])
                write_path = os.path.splitext(write_path)[0] + ".yaml"
                # if dir not exists, create it (recursively)
                if not os.path.exists(os.path.dirname(write_path)):
                    os.makedirs(os.path.dirname(write_path))
                with open(write_path, "w", encoding="utf-8") as f_out:
                    f_out.write("payload:\n")
                    line_count = 0
                    for line in lines:
                        line_count += 1
                        if line == "\n":
                            pass
                        elif line.lstrip().startswith("#"):
                            if not line.lstrip().startswith("# "):
                                f_out.write(f"  # {line.strip()[1:]}")
                            else:
                                f_out.write(f"  {line.strip()}")
                        elif line.lstrip().startswith("USER-AGENT"):
                            f_out.write(f"  # {line.strip()}")
                        elif line.lstrip().startswith("URL-REGEX"):
                            f_out.write(f"  # {line.strip()}")
                        elif line.lstrip().startswith("PROCESS-NAME"):
                            f_out.write(f"  # {line.strip()}")
                        else:
                            f_out.write(f"  - {line.strip()}")
                        if line_count < len(lines):
                            f_out.write("\n")

# remove those not exist outside `Providers`
for root, dirs, files in os.walk("Clash"):
    for file in files:
        if file.endswith(".yaml"):
            path_l = os.path.join(root, file).split(os.sep)
            # eg: `Clash/Providers/Ruleset/58.yaml` -> `Clash/Ruleset/58.list`
            read_path = os.path.join(*path_l[:1], *path_l[2:])
            read_path = os.path.splitext(read_path)[0] + ".list"
            if not os.path.exists(read_path):
                print(f"remove: {os.path.join(root, file)}")
                os.remove(os.path.join(root, file))
