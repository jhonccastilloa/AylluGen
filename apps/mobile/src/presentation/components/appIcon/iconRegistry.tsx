import {
  HouseIcon,
  UserIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  WarningIcon,
  PercentIcon,
  EnvelopeIcon,
  SignOutIcon,
  CurrencyDollarIcon,
  UsersThreeIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  PlusIcon,
  MoneyIcon,
  ArrowLeftIcon,
  CaretRightIcon,
  HandTapIcon,
  HandArrowUpIcon,
  HandArrowDownIcon,
  XIcon,
  ClockIcon,
  AddressBookIcon,
  TrashIcon,
  PencilIcon,
  LockIcon,
  CreditCardIcon,
  PaletteIcon,
  GlobeIcon,
  KeyIcon,
  SunIcon,
  MoonIcon,
  DesktopIcon,
} from 'phosphor-react-native';

interface IconProps {
  size: number;
  color: string;
}

const iconRegistry = {
  none: () => <></>,
  home: (props: IconProps) => (
    <HouseIcon color={props.color} size={props.size} />
  ),

  money: (props: IconProps) => (
    <MoneyIcon color={props.color} size={props.size} />
  ),

  signOut: (props: IconProps) => <SignOutIcon {...props} />,
  key: (props: IconProps) => <KeyIcon {...props} />,
  sun: (props: IconProps) => <SunIcon {...props} />,
  moon: (props: IconProps) => <MoonIcon {...props} />,
  desktop: (props: IconProps) => <DesktopIcon {...props} />,
  palette: (props: IconProps) => <PaletteIcon {...props} />,
  global: (props: IconProps) => <GlobeIcon {...props} />,
  user: (props: IconProps) => (
    <UserIcon color={props.color} size={props.size} />
  ),
  trash: (props: IconProps) => (
    <TrashIcon color={props.color} size={props.size} />
  ),
  creditCard: (props: IconProps) => (
    <CreditCardIcon color={props.color} size={props.size} />
  ),
  pencil: (props: IconProps) => (
    <PencilIcon color={props.color} size={props.size} />
  ),
  lock: (props: IconProps) => (
    <LockIcon color={props.color} size={props.size} />
  ),

  addressBook: (props: IconProps) => (
    <AddressBookIcon color={props.color} size={props.size} />
  ),
  plus: (props: IconProps) => (
    <PlusIcon color={props.color} size={props.size} weight="bold" />
  ),
  handArrowUp: (props: IconProps) => (
    <HandArrowUpIcon color={props.color} size={props.size} />
  ),
  handArrowDown: (props: IconProps) => (
    <HandArrowDownIcon color={props.color} size={props.size} />
  ),
  caretRight: (props: IconProps) => (
    <CaretRightIcon color={props.color} size={props.size} weight="bold" />
  ),
  handTap: (props: IconProps) => (
    <HandTapIcon color={props.color} size={props.size} weight="bold" />
  ),
  userCircle: (props: IconProps) => (
    <UserCircleIcon color={props.color} size={props.size} />
  ),
  usersThree: (props: IconProps) => (
    <UsersThreeIcon color={props.color} size={props.size} />
  ),
  slidersHorizontal: (props: IconProps) => (
    <SlidersHorizontalIcon color={props.color} size={props.size} />
  ),

  envelope: (props: IconProps) => (
    <EnvelopeIcon color={props.color} size={props.size} />
  ),
  currencyDolar: (props: IconProps) => (
    <CurrencyDollarIcon color={props.color} size={props.size} weight="bold" />
  ),
  arrowLeft: (props: IconProps) => (
    <ArrowLeftIcon color={props.color} size={props.size} weight="bold" />
  ),

  percent: (props: IconProps) => (
    <PercentIcon color={props.color} size={props.size} weight="bold" />
  ),
  calendarBlank: (props: IconProps) => (
    <CalendarBlankIcon color={props.color} size={props.size} />
  ),
  search: (props: IconProps) => (
    <MagnifyingGlassIcon color={props.color} size={props.size} />
  ),
  close: (props: IconProps) => (
    <XIcon color={props.color} size={props.size} weight="bold" />
  ),
  closeLight: (props: IconProps) => (
    <XIcon color={props.color} size={props.size} />
  ),
  clock: (props: IconProps) => (
    <ClockIcon color={props.color} size={props.size} />
  ),
  toastSuccess: (props: IconProps) => (
    <CheckCircleIcon color={props.color} size={props.size} weight="fill" />
  ),
  toastError: (props: IconProps) => (
    <XCircleIcon color={props.color} size={props.size} weight="fill" />
  ),
  toastInfo: (props: IconProps) => (
    <InfoIcon color={props.color} size={props.size} weight="fill" />
  ),
  toastWarning: (props: IconProps) => (
    <WarningIcon color={props.color} size={props.size} weight="fill" />
  ),

  myLogo: (props: IconProps) => (
    <WarningIcon color={props.color} size={props.size} weight="fill" />
  ),
} as const;

export type IconName = keyof typeof iconRegistry;
export default iconRegistry;
