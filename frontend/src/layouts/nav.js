import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import MemoryOutlinedIcon from "@mui/icons-material/MemoryOutlined";
import DatasetOutlinedIcon from "@mui/icons-material/DatasetOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", Icon: SpaceDashboardOutlinedIcon, desc: "Robustness at a glance" },
      { to: "/demo", label: "Demo Mode", Icon: RocketLaunchOutlinedIcon, desc: "One-click evaluation sequence" },
    ],
  },
  {
    label: "Assets",
    items: [
      { to: "/models", label: "Models", Icon: MemoryOutlinedIcon, desc: "Train, upload, registry" },
      { to: "/datasets", label: "Datasets", Icon: DatasetOutlinedIcon, desc: "MNIST · CIFAR-10 · GTSRB" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/attacks", label: "Attacks", Icon: BoltOutlinedIcon, desc: "Attack engines and the Adversarial Lab" },
      { to: "/defenses", label: "Defenses", Icon: ShieldOutlinedIcon, desc: "Defenses and the Purification Lab" },
      { to: "/evaluation", label: "Evaluation", Icon: PlayCircleOutlineRoundedIcon, desc: "Run an attack, get metrics" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { to: "/explainability", label: "Explainability", Icon: InsightsOutlinedIcon, desc: "GradCAM and SHAP" },
      { to: "/reports", label: "Reports", Icon: DescriptionOutlinedIcon, desc: "History and downloads" },
    ],
  },
  {
    label: "System",
    items: [{ to: "/settings", label: "Settings", Icon: TuneOutlinedIcon, desc: "Compute, status, appearance" }],
  },
];

export const NAV = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

export const findNav = (pathname) => NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)));
