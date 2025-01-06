#!/usr/bin/env python3

from dataclasses import dataclass
import os
import typing
import json

class EnhancedJSONEncoder(json.JSONEncoder):
        def default(self, o):
            if hasattr(o, 'dict'):
                return o.dict()
            return json.JSONEncoder.default(self, o)
            

@dataclass
class HeadlessRule:
    # query_type: list of int or str
    query_type: typing.List[typing.Union[int, str]] = None
    network: list[str] = None
    domain: list[str] = None
    domain_suffix: list[str] = None
    domain_keyword: list[str] = None
    domain_regex: list[str] = None
    source_ip_cidr: list[str] = None
    ip_cidr: list[str] = None
    source_port: list[int] = None
    source_port_range: list[str] = None
    port: list[int] = None
    port_range: list[str] = None
    process_name: list[str] = None
    process_path: list[str] = None
    package_name: list[str] = None
    wifi_ssid: list[str] = None
    wifi_bssid: list[str] = None
    invert: bool = None

    def append(self, key: str, value: str):
        if getattr(self, key) is None:
            setattr(self, key, [])
        getattr(self, key).append(value)

    def dict(self):
        return {k: v for k, v in self.__dict__.items() if v is not None}

@dataclass
class Rule:
    version: int = 2
    rules: list[HeadlessRule] = None

    def dict(self):
        return {k: v for k, v in self.__dict__.items() if v is not None}
    
    def json(self):
        return json.dumps(self.dict(), indent=2, cls=EnhancedJSONEncoder)

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

            headless_rule = HeadlessRule()
            with open(os.path.join(root, file), encoding="utf-8") as f_in:
                lines = f_in.readlines()
                write_path = os.path.join("sing-box", *path_l[1:])
                write_path = os.path.splitext(write_path)[0] + ".json"
                # if dir not exists, create it (recursively)
                if not os.path.exists(os.path.dirname(write_path)):
                    os.makedirs(os.path.dirname(write_path))
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("#"):
                        continue
                    if line.split(",")[0] == "DOMAIN":
                        headless_rule.append("domain", line.split(",")[1])
                    elif line.split(",")[0] == "DOMAIN-SUFFIX":
                        headless_rule.append("domain_suffix", line.split(",")[1])
                    elif line.split(",")[0] == "DOMAIN-KEYWORD":
                        headless_rule.append("domain_keyword", line.split(",")[1])
                    elif line.split(",")[0] == "DOMAIN-REGEX":
                        headless_rule.append("domain_regex", line.split(",")[1])
                    elif line.split(",")[0] == "IP-CIDR" or line.split(",")[0] == "IP-CIDR6":
                        headless_rule.append("ip_cidr", line.split(",")[1])
                    elif line.split(",")[0] == "SOURCE-IP-CIDR":
                        headless_rule.append("source_ip_cidr", line.split(",")[1])
                    elif line.split(",")[0] == "SRC-PORT":
                        items = line.split(",")[1].split("/")
                        for item in items:
                            if "-" in item:
                                headless_rule.append("source_port_range", ":".join(item.split("-")))
                            else:
                                headless_rule.append("source_port", item)
                    elif line.split(",")[0] == "DST-PORT":
                        items = line.split(",")[1].split("/")
                        for item in items:
                            if "-" in item:
                                headless_rule.append("port_range", ":".join(item.split("-")))
                            else:
                                headless_rule.append("port", item)
                    elif line.split(",")[0] == "PROCESS-NAME":
                        headless_rule.append("process_name", line.split(",")[1])
                    elif line.split(",")[0] == "PROCESS-PATH":
                        headless_rule.append("process_path", line.split(",")[1])

            rule = Rule(rules=[headless_rule])
            # write source
            with open(write_path, "w", encoding="utf-8") as f_out:
                f_out.write(rule.json())
            # compile `sing-box rule-set compile [--output <file-name>.srs] <file-name>.json` and delete json
            os.system(f"sing-box rule-set compile {write_path}")
            os.remove(write_path)

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
