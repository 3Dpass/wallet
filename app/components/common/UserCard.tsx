import { Card, Classes, Elevation, Icon, IconSize, Tag } from "@blueprintjs/core";
type IRegistrarInfoItem = {
    Raw: string;
}

type IRegistrarInfo = {
    display: IRegistrarInfoItem;
    email: IRegistrarInfoItem;
    web: IRegistrarInfoItem;
    twitter: IRegistrarInfoItem;
    image: IRegistrarInfoItem;
}

export type IPalletIdentityRegistrarInfo = {
    account: string;
    fee: string;
    fields: number[];
    info: IRegistrarInfo;
    judgements: string[][];
    regIndex: number;
}

type IProps = {
    registrarInfo: IPalletIdentityRegistrarInfo;
}

export default function UserCard({ registrarInfo }: IProps) {
  return (
    <Card interactive={true} elevation={Elevation.TWO}>
        <div style={{"display": "block"}}>
            <Icon icon="person" iconSize={IconSize.LARGE * 3} title="hgsfdhfiudsuifhsfdhifjoijao fdsjfoidsjfo sdfsdjf sdof"></Icon>
            <span style={{"marginLeft": "3rem", "fontSize": "150%", "verticalAlign": "top"}}>{registrarInfo.info.display.Raw as string}</span>
        </div>

        {registrarInfo.judgements && (
            <div style={{"margin": "0.5rem 0rem"}}>
                <Tag round large className={Classes.BREADCRUMB_CURRENT} style={{"backgroundColor": "green"}}>
                    {registrarInfo.judgements[0][0] as string} {registrarInfo.judgements[0][1] as string}
                </Tag>
            </div>
        )}

        <div className="grid grid-cols-2 gap-1">
            <div>EMAIL</div>
            <div>{registrarInfo.info.email.Raw as string}</div>
            <div>WEBSITE</div>
            <div>{registrarInfo.info.web.Raw as string}</div>
            <div>TWITTER</div>
            <div>{registrarInfo.info.twitter.Raw as string}</div>
        </div>
    </Card>
  );
}
